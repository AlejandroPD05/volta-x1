import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { MeshStandardMaterial, Vector2, type Group } from 'three'
import { sim } from '../../estado/sim'
import { useUsoTienda } from '../../estado/usoTienda'
import { Parte, SoloDespiece } from './Parte'
import { MM, RUEDA_ANCHO, RUEDA_RADIO } from './geometriaRaton'
import { crearMapaNormal } from './texturas'
import { useModeloRaton } from './modeloRaton'

/**
 * Capa 2: rueda de scroll + encoder.
 *
 * La rueda del Surge: Ø 20 mm de goma negra con 24 tacos cuadrados, cada uno
 * partido por un surco central, sobre un buje de plástico. Gira sola despacio
 * y acelera al descomponerse. El eje descansa en dos soportes: a la izquierda
 * el encoder mecánico, a la derecha la horquilla del microswitch del clic.
 */
export function RuedaScroll() {
  const modelo = useModeloRaton()
  const reducido = useUsoTienda((s) => s.reducido)
  const giro = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!reducido && giro.current) {
      // Gira siempre despacio; al descomponerse acelera (se "desenrolla").
      giro.current.rotation.x -= delta * (0.6 + sim.explosion * 3.2)
    }
  })

  const materiales = useMemo(() => {
    // Caucho: grano más cerrado y con más fuerza que el plástico.
    const caucho = crearMapaNormal({ repeticion: 2.5, fuerza: 3.4, manchas: 0.35, semilla: 5 })
    return {
      goma: new MeshStandardMaterial({
        color: '#121417',
        roughness: 0.8,
        metalness: 0,
        normalMap: caucho,
        normalScale: new Vector2(0.5, 0.5),
      }),
      eje: new MeshStandardMaterial({ color: '#2a2f38', roughness: 0.3, metalness: 0.9 }),
      cuerpo: new MeshStandardMaterial({ color: '#101318', roughness: 0.5, metalness: 0.3 }),
    }
  }, [])

  const centro = modelo.Rueda.posicion
  const xSoporte = RUEDA_ANCHO / 2 + 2.2 * MM
  return (
    <Parte desplazamiento={[0, 1.32, 0.02]} retardo={0.1}>
      <group position={centro}>
        <group ref={giro}>
          <mesh geometry={modelo.Rueda.geometria} material={materiales.goma} />
        </group>
        <SoloDespiece>
          {/* Eje pasante */}
          <mesh material={materiales.eje} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.1 * MM, 1.1 * MM, 2 * xSoporte + 6 * MM, 16]} />
          </mesh>
          {/* Encoder mecánico (izquierda) */}
          <RoundedBox
            args={[4.5 * MM, 9 * MM, 10 * MM]}
            radius={0.6 * MM}
            smoothness={3}
            position={[xSoporte + 1.6 * MM, -3.5 * MM, 0]}
            material={materiales.cuerpo}
          />
          {/* Horquilla del clic central (derecha) */}
          <mesh material={materiales.eje} position={[-xSoporte, -RUEDA_RADIO * 0.55, 0]}>
            <boxGeometry args={[1.2 * MM, RUEDA_RADIO * 1.1, 5 * MM]} />
          </mesh>
          <mesh position={[-xSoporte - 1.5 * MM, -RUEDA_RADIO * 0.95, 1.5 * MM]}>
            <boxGeometry args={[3 * MM, 2.4 * MM, 4 * MM]} />
            <meshStandardMaterial color="#8f1f24" roughness={0.45} metalness={0.1} />
          </mesh>
        </SoloDespiece>
      </group>
    </Parte>
  )
}
