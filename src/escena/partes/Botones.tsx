import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Vector2 } from 'three'
import { Parte } from './Parte'
import { crearMapaNormal } from './texturas'

/**
 * Capa 3: clickers ópticos.
 *
 * Los dos switches ópticos que viven bajo las tapas clicables (las tapas
 * viajan con el casco, como en el hardware real) y los dos botones laterales
 * del flanco izquierdo (ratón diestro, como el Pulsefire Surge).
 * Cada switch lleva su plunger claro y el puntito rojo del LED emisor.
 */
export function Botones() {
  // Los laterales comparten el grano soft-touch del casco: son la misma pieza
  // de plástico, y sin él se notaban "pegatina".
  const { granoLateral, escalaGrano } = useMemo(
    () => ({
      granoLateral: crearMapaNormal({ repeticion: 3, fuerza: 2, semilla: 13 }),
      escalaGrano: new Vector2(0.28, 0.28),
    }),
    [],
  )

  return (
    <Parte desplazamiento={[0, 1.22, 0.06]} retardo={0.2}>
      {/* Switch óptico izquierdo: cuerpo bajo apoyado en la PCB (4 mm), con
          el plunger y el LED en la cara frontal. Todo va hundido lo justo
          para que, mirando por el canal de la ranura, solo se vea penumbra. */}
      <group position={[-0.115, 0, 0.3]}>
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
      <group position={[0.115, 0, 0.3]}>
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

      {/* Botones laterales: dos, solo en el flanco izquierdo (ratón diestro,
          como el Pulsefire Surge). Van embutidos en un rebaje oscuro y a ras
          de la pared: se leen por el marco, no por sobresalir. La inclinación
          (rotación Z negativa) sigue la pendiente del casco, que se cierra
          hacia arriba. */}
      {[0.045, -0.075].map((z) => (
        <group key={z}>
          <RoundedBox
            args={[0.02, 0.044, 0.098]}
            radius={0.009}
            smoothness={4}
            position={[-0.2667, 0.205, z]}
            rotation={[0, 0, -0.32]}
          >
            <meshStandardMaterial color="#0a0c10" roughness={0.85} metalness={0.05} />
          </RoundedBox>
          <RoundedBox
            args={[0.018, 0.034, 0.085]}
            radius={0.008}
            smoothness={4}
            position={[-0.2700, 0.205, z]}
            rotation={[0, 0, -0.32]}
          >
            <meshStandardMaterial
              color="#191c22"
              roughness={0.42}
              metalness={0.05}
              normalMap={granoLateral}
              normalScale={escalaGrano}
            />
          </RoundedBox>
        </group>
      ))}
    </Parte>
  )
}
