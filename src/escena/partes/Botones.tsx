import { RoundedBox } from '@react-three/drei'
import { Parte } from './Parte'

const CUERPO_BOTON: [number, number, number] = [0.15, 0.05, 0.11]

/**
 * Capa 3: clickers ópticos.
 * Los dos switches ópticos Gen-3 que hay bajo las planchas clicables y los
 * dos botones laterales. El "plunger" claro asoma por arriba para que se
 * lea que son interruptores reales durante la explosión. (Las planchas que
 * los pulsan viajan con la carcasa superior, como en el hardware real.)
 */
export function Botones() {
  return (
    <Parte desplazamiento={[0, 1.22, 0.06]} retardo={0.26}>
      {/* Switch izquierdo */}
      <RoundedBox args={CUERPO_BOTON} radius={0.01} smoothness={3} position={[-0.13, 0.265, 0.42]}>
        <meshStandardMaterial color="#17181c" roughness={0.4} metalness={0.35} />
      </RoundedBox>
      <mesh position={[-0.13, 0.296, 0.42]}>
        <boxGeometry args={[0.06, 0.016, 0.06]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Switch derecho */}
      <RoundedBox args={CUERPO_BOTON} radius={0.01} smoothness={3} position={[0.13, 0.265, 0.42]}>
        <meshStandardMaterial color="#17181c" roughness={0.4} metalness={0.35} />
      </RoundedBox>
      <mesh position={[0.13, 0.296, 0.42]}>
        <boxGeometry args={[0.06, 0.016, 0.06]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Botones laterales (lado izquierdo) */}
      <RoundedBox args={[0.022, 0.06, 0.16]} radius={0.008} smoothness={3} position={[-0.285, 0.25, 0.04]}>
        <meshStandardMaterial color="#1b1e24" roughness={0.45} metalness={0.3} />
      </RoundedBox>
      <RoundedBox args={[0.022, 0.06, 0.16]} radius={0.008} smoothness={3} position={[-0.285, 0.25, -0.14]}>
        <meshStandardMaterial color="#1b1e24" roughness={0.45} metalness={0.3} />
      </RoundedBox>
    </Parte>
  )
}
