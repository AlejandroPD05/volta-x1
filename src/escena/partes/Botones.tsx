import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { MeshStandardMaterial, Vector2 } from 'three'
import { Parte, SoloDespiece } from './Parte'
import { crearMapaNormal } from './texturas'
import { useModeloRaton } from './modeloRaton'

/**
 * Capa 3: clickers ópticos.
 *
 * Los dos switches ópticos que viven bajo las tapas clicables (las tapas
 * viajan con el casco, como en el hardware real) y los dos botones laterales
 * del flanco izquierdo (ratón diestro, como el Pulsefire Surge).
 * Cada switch lleva su plunger claro y el puntito rojo del LED emisor.
 */
export function Botones() {
  const modelo = useModeloRaton()
  // Los laterales comparten el grano de los flancos: son el mismo plástico.
  const materialLateral = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#0a0b0d',
        vertexColors: true,
        roughness: 0.45,
        metalness: 0.05,
        normalMap: crearMapaNormal({ repeticion: 4, fuerza: 1.6, manchas: 0.2, semilla: 13 }),
        normalScale: new Vector2(0.12, 0.12),
      }),
    [],
  )

  return (
    <Parte desplazamiento={[0, 1.22, 0.06]} retardo={0.2}>
      <SoloDespiece>
        {/* Switch óptico izquierdo: cuerpo bajo apoyado en la PCB (4 mm), con
            el plunger y el LED en la cara frontal. Todo va hundido lo justo
            para que, mirando por el canal de la ranura, solo se vea penumbra. */}
        <group position={[-0.115, -0.06, 0.3]}>
          <RoundedBox args={[0.14, 0.04, 0.11]} radius={0.008} smoothness={3} position={[0, 0.201, 0]}>
            <meshStandardMaterial color="#101216" roughness={0.55} metalness={0.2} />
          </RoundedBox>
          <RoundedBox args={[0.06, 0.02, 0.06]} radius={0.004} smoothness={3} position={[0, 0.227, 0.012]}>
            <meshStandardMaterial color="#a8adb5" roughness={0.7} metalness={0} />
          </RoundedBox>
          {/* LED emisor del switch óptico, pegado a la cara frontal */}
          <mesh position={[0, 0.209, -0.052]}>
            <boxGeometry args={[0.02, 0.012, 0.006]} />
            <meshStandardMaterial color="#05070b" emissive="#ff3b30" emissiveIntensity={1.6} />
          </mesh>
          {/* Patas de soldadura apoyadas en la PCB, asomando por delante */}
          <mesh position={[0, 0.185, 0.058]}>
            <boxGeometry args={[0.1, 0.008, 0.014]} />
            <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
          </mesh>
        </group>

        {/* Switch óptico derecho (espejo) */}
        <group position={[0.115, -0.06, 0.3]}>
          <RoundedBox args={[0.14, 0.04, 0.11]} radius={0.008} smoothness={3} position={[0, 0.201, 0]}>
            <meshStandardMaterial color="#101216" roughness={0.55} metalness={0.2} />
          </RoundedBox>
          <RoundedBox args={[0.06, 0.02, 0.06]} radius={0.004} smoothness={3} position={[0, 0.227, 0.012]}>
            <meshStandardMaterial color="#a8adb5" roughness={0.7} metalness={0} />
          </RoundedBox>
          <mesh position={[0, 0.209, -0.052]}>
            <boxGeometry args={[0.02, 0.012, 0.006]} />
            <meshStandardMaterial color="#05070b" emissive="#ff3b30" emissiveIntensity={1.6} />
          </mesh>
          <mesh position={[0, 0.185, 0.058]}>
            <boxGeometry args={[0.1, 0.008, 0.014]} />
            <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
          </mesh>
        </group>
      </SoloDespiece>

      {/* Botones laterales: los dos del flanco izquierdo, con la silueta
          del Surge (el delantero más corto y biselado por delante, el
          trasero más largo y en flecha hacia la cola). Asoman 0,75 mm de su
          rebaje en la carcasa inferior. */}
      <mesh geometry={modelo.BotonLateralDelantero.geometria} material={materialLateral} />
      <mesh geometry={modelo.BotonLateralTrasero.geometria} material={materialLateral} />
    </Parte>
  )
}
