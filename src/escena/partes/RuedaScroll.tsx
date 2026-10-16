import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { Group } from 'three'
import { sim } from '../../estado/sim'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'

/**
 * Capa 2: rueda de scroll + encoder óptico.
 * La rueda tiene un aro de luz interior que asoma por los laterales; además
 * gira sola (más rápido al explotar) para que la pieza se sienta "viva".
 * El encoder va montado justo debajo, como en el hardware real.
 */
export function RuedaScroll() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)
  const giroRueda = useRef<Group>(null)

  useFrame((_, delta) => {
    if (giroRueda.current) {
      // Gira siempre despacio; al descomponerse acelera (se "desenrolla").
      giroRueda.current.rotation.y -= delta * (0.6 + sim.explosion * 3.2)
    }
  })

  return (
    <Parte desplazamiento={[0, 1.32, 0.02]} retardo={0.32}>
      {/* Grupo que orienta el cilindro: eje X del mundo */}
      <group position={[0, 0.335, 0.4]} rotation={[0, 0, Math.PI / 2]}>
        <group ref={giroRueda}>
          {/* Llanta de silicona */}
          <mesh>
            <cylinderGeometry args={[0.075, 0.075, 0.055, 24]} />
            <meshStandardMaterial color="#0f1115" roughness={0.55} metalness={0.1} />
          </mesh>
          {/* Aro de luz interior (asoma por los cantos) */}
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.063, 20]} />
            <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={1.6} />
          </mesh>
        </group>
      </group>

      {/* Encoder óptico */}
      <RoundedBox args={[0.07, 0.06, 0.07]} radius={0.008} smoothness={3} position={[0, 0.26, 0.34]}>
        <meshStandardMaterial color="#cfd6dd" roughness={0.3} metalness={0.8} />
      </RoundedBox>
    </Parte>
  )
}
