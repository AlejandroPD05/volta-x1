import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { DoubleSide, MeshStandardMaterial, Vector2, type Group } from 'three'
import { sim } from '../../estado/sim'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'
import {
  RUEDA_CENTRO_Y,
  RUEDA_RADIO,
  RUEDA_Z,
  crearLlantaRueda,
} from './geometriaRaton'
import { crearMapaNormal } from './texturas'
import { parchearOnda } from '../sobrecarga'

/**
 * Capa 2: rueda de scroll + encoder.
 *
 * La rueda de verdad: dos mitades de goma con estrías fresadas y un aro de
 * luz RGB asomando entre ambas, sobre un eje transversal sujeto por dos
 * soportes. Gira sola despacio y acelera al descomponerse. Debajo, el
 * encoder óptico con su microswitch central.
 */
export function RuedaScroll() {
  const acento = useUsoTienda((s) => s.acento)
  const reducido = useUsoTienda((s) => s.reducido)
  const hex = hexAcento(acento)
  const giro = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!reducido && giro.current) {
      // Gira siempre despacio; al descomponerse acelera (se "desenrolla").
      giro.current.rotation.x -= delta * (0.6 + sim.explosion * 3.2)
    }
  })

  const piezas = useMemo(() => {
    // Caucho: la misma familia de grano que el plástico, pero más cerrado y
    // con más fuerza — la goma atrapa la luz de otra manera.
    const caucho = crearMapaNormal({
      repeticion: [16, 3],
      fuerza: 3.4,
      manchas: 0.35,
      semilla: 5,
    })
    return {
      llanta: crearLlantaRueda(RUEDA_RADIO, 0.021),
      goma: new MeshStandardMaterial({
        color: '#101216',
        roughness: 0.78,
        metalness: 0,
        normalMap: caucho,
        normalScale: new Vector2(0.55, 0.55),
        side: DoubleSide,
      }),
      eje: new MeshStandardMaterial({
        color: '#2a2f38',
        roughness: 0.3,
        metalness: 0.9,
      }),
      cuerpoEncoder: new MeshStandardMaterial({
        color: '#101318',
        roughness: 0.5,
        metalness: 0.3,
      }),
    }
  }, [])

  // El aro de luz es lo único de la rueda que depende del acento (la llanta y
  // el grano de la goma se construyen una única vez).
  const materialAro = useMemo(
    () =>
      parchearOnda(
        new MeshStandardMaterial({
          color: '#05070b',
          emissive: hex,
          emissiveIntensity: 2.4,
          roughness: 0.4,
          metalness: 0,
        }),
      ),
    [hex],
  )

  return (
    <Parte desplazamiento={[0, 1.32, 0.02]} retardo={0.1}>
      {/* Conjunto giratorio: llantas + aro de luz + eje */}
      <group ref={giro} position={[0, RUEDA_CENTRO_Y, RUEDA_Z]}>
        <mesh geometry={piezas.llanta} material={piezas.goma} position={[-0.0165, 0, 0]} />
        <mesh geometry={piezas.llanta} material={piezas.goma} position={[0.0165, 0, 0]} />
        <mesh material={materialAro} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[RUEDA_RADIO - 0.004, RUEDA_RADIO - 0.004, 0.0125, 48]} />
        </mesh>
        <mesh material={piezas.eje} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, 0.075, 20]} />
        </mesh>
      </group>

      {/* Soportes del eje, atornillados a la base de la rueda */}
      <mesh material={piezas.eje} position={[-0.0335, 0.205, RUEDA_Z]}>
        <boxGeometry args={[0.006, 0.055, 0.026]} />
      </mesh>
      <mesh material={piezas.eje} position={[0.0335, 0.205, RUEDA_Z]}>
        <boxGeometry args={[0.006, 0.055, 0.026]} />
      </mesh>

      {/* Encoder óptico con el microswitch del clic central */}
      <RoundedBox
        args={[0.06, 0.045, 0.06]}
        radius={0.006}
        smoothness={3}
        position={[0, 0.176, RUEDA_Z]}
        material={piezas.cuerpoEncoder}
      />
      <mesh position={[0, 0.202, RUEDA_Z - 0.024]}>
        <boxGeometry args={[0.014, 0.008, 0.008]} />
        <meshStandardMaterial color="#8f1f24" roughness={0.45} metalness={0.1} />
      </mesh>
    </Parte>
  )
}
