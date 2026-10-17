import { useMemo } from 'react'
import { ExtrudeGeometry, MeshStandardMaterial, Vector2 } from 'three'
import { RoundedBox } from '@react-three/drei'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'
import {
  crearTexturasRayado,
  crearTexturaGrano,
  crearTexturaRugosidad,
} from './texturas'
import { formaAnular, formaContorno } from './geometriaRaton'
import { parchearOnda } from '../sobrecarga'

/**
 * Capa 6 (la más baja): la base.
 *
 * Extrusión del mismo contorno de planta que el casco (así el ensamblaje
 * cierra a ras de la línea de separación, sin muescas) con el borde inferior
 * biselado, la tira de luz RGB perimetral en la ranura entre base y casco
 * —la firma del Pulsefire Surge—, cuatro patines de PTFE, la lente sellada
 * del sensor, dos tornillos, el interruptor de encendido y la etiqueta con
 * código de barras. Esta capa no se desplaza: es el "suelo" del despiece.
 */
export function CarcasaInferior() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  const piezas = useMemo(() => {
    const grano = crearTexturaGrano()
    const satinado = crearTexturaRugosidad({ semilla: 31 })
    const rayado = crearTexturasRayado()

    const base = new ExtrudeGeometry(formaContorno(0.992), {
      depth: 0.0715,
      bevelEnabled: true,
      bevelThickness: 0.0045,
      bevelSize: 0.004,
      // El bisel debe crecer hacia DENTRO (offset = -bevelSize). Con offset 0
      // ExtrudeGeometry expande la silueta hacia fuera y la base asoma por la
      // cola y por los flancos, por fuera del casco (el "triángulo" oscuro).
      bevelOffset: -0.004,
      bevelSegments: 3,
      curveSegments: 24,
    })
    base.rotateX(Math.PI / 2)
    base.translate(0, 0.1, 0)

    const anillo = new ExtrudeGeometry(formaAnular(0.998), {
      depth: 0.013,
      bevelEnabled: false,
      curveSegments: 24,
    })
    anillo.rotateX(Math.PI / 2)
    anillo.translate(0, 0.107, 0)

    return {
      base,
      anillo,
      materialBase: new MeshStandardMaterial({
        color: '#14171d',
        roughness: 0.78,
        metalness: 0,
        roughnessMap: satinado,
        bumpMap: grano,
        bumpScale: 0.35,
      }),
      // Patines de PTFE: blancos y sedosos, con el fresado y la rodadura
      // marcados en el brillo (antes eran el plástico más "de mentira").
      materialPtfe: new MeshStandardMaterial({
        color: '#dfe5ea',
        roughness: 0.45,
        metalness: 0.05,
        roughnessMap: rayado.rugosidad,
        normalMap: rayado.normal,
        normalScale: new Vector2(0.35, 0.35),
      }),
      materialMetal: new MeshStandardMaterial({
        color: '#9aa4b0',
        roughness: 0.35,
        metalness: 0.85,
      }),
    }
  }, [])

  // Solo los materiales teñidos por el acento dependen del color: recrearlos
  // es barato y evita que cada cambio de color re-tesele la base o rehaga las
  // texturas de grano (antes, todo el bloque de arriba se repetía).
  const materialesAcento = useMemo(
    () => ({
      anillo: parchearOnda(
        new MeshStandardMaterial({
          color: '#05070b',
          emissive: hex,
          emissiveIntensity: 2.8,
          roughness: 0.45,
        }),
      ),
      lente: parchearOnda(
        new MeshStandardMaterial({
          color: '#0a0c10',
          emissive: hex,
          emissiveIntensity: 0.7,
          roughness: 0.2,
          metalness: 0.4,
        }),
      ),
    }),
    [hex],
  )

  return (
    <Parte desplazamiento={[0, -0.02, 0]} retardo={0}>
      {/* Base + anillo RGB perimetral */}
      <mesh geometry={piezas.base} material={piezas.materialBase} />
      <mesh geometry={piezas.anillo} material={materialesAcento.anillo} />

      {/* Patines de PTFE: delantero, trasero y los dos laterales. Van
          embutidos en el fondo de la base (apoyan dentro de ella) y asoman
          solo ~0,8 mm, como unos patines reales: antes colgaban sueltos por
          debajo y se veían como pestañas blancas. */}
      <RoundedBox args={[0.38, 0.012, 0.1]} radius={0.005} smoothness={4} position={[0, 0.022, 0.46]} material={piezas.materialPtfe} />
      <RoundedBox args={[0.38, 0.012, 0.1]} radius={0.005} smoothness={4} position={[0, 0.022, -0.42]} material={piezas.materialPtfe} />
      <RoundedBox args={[0.1, 0.012, 0.18]} radius={0.005} smoothness={4} position={[0.19, 0.022, 0.02]} material={piezas.materialPtfe} />
      <RoundedBox args={[0.1, 0.012, 0.18]} radius={0.005} smoothness={4} position={[-0.19, 0.022, 0.02]} material={piezas.materialPtfe} />

      {/* Lente del sensor: aro oscuro embutido con la óptica al fondo */}
      <mesh position={[0, 0.0262, 0.1]} material={piezas.materialBase}>
        <cylinderGeometry args={[0.03, 0.03, 0.011, 32]} />
      </mesh>
      <mesh position={[0, 0.0266, 0.1]} material={materialesAcento.lente}>
        <cylinderGeometry args={[0.013, 0.013, 0.008, 24]} />
      </mesh>

      {/* Tornillos: aro de embutido + cabeza con ranura en cruz. Todo queda
          por encima del plano de los patines, como en una base real. */}
      {[0.555, -0.5].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.0222, 0]} material={piezas.materialBase}>
            <cylinderGeometry args={[0.011, 0.011, 0.012, 24]} />
          </mesh>
          <mesh position={[0, 0.0195, 0]} material={piezas.materialMetal}>
            <cylinderGeometry args={[0.0085, 0.0085, 0.006, 24]} />
          </mesh>
          <mesh position={[0, 0.0164, 0]}>
            <boxGeometry args={[0.016, 0.0012, 0.0032]} />
            <meshStandardMaterial color="#3a4049" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.0163, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.016, 0.0012, 0.0032]} />
            <meshStandardMaterial color="#3a4049" roughness={0.5} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Interruptor de encendido deslizante */}
      <mesh position={[0, 0.0222, -0.335]} material={piezas.materialBase}>
        <boxGeometry args={[0.05, 0.004, 0.028]} />
      </mesh>
      <mesh position={[0, 0.0195, -0.328]} material={piezas.materialMetal}>
        <boxGeometry args={[0.014, 0.006, 0.016]} />
      </mesh>
      <mesh position={[0.012, 0.0237, -0.352]}>
        <boxGeometry args={[0.006, 0.001, 0.002]} />
        <meshStandardMaterial color="#6b7480" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Etiqueta con código de barras y líneas de texto impresas */}
      <RoundedBox
        args={[0.17, 0.0018, 0.11]}
        radius={0.0007}
        smoothness={3}
        position={[-0.06, 0.0235, -0.15]}
        material={piezas.materialPtfe}
      />
      {[-0.128, -0.121, -0.111, -0.104, -0.096, -0.086, -0.079, -0.071, -0.063].map(
        (x, i) => (
          <mesh key={x} position={[x, 0.0222, -0.15 - (i % 2) * 0.004]}>
            <boxGeometry args={[i % 3 === 0 ? 0.0032 : 0.0016, 0.0012, 0.062]} />
            <meshStandardMaterial color="#1a1d22" roughness={0.7} metalness={0} />
          </mesh>
        ),
      )}
      {[
        [-0.02, -0.135, 0.07],
        [-0.035, -0.169, 0.05],
      ].map(([x, z, ancho]) => (
        <mesh key={`${x}`} position={[x, 0.0222, z]}>
          <boxGeometry args={[ancho, 0.0012, 0.006]} />
          <meshStandardMaterial color="#565e68" roughness={0.7} metalness={0} />
        </mesh>
      ))}
    </Parte>
  )
}
