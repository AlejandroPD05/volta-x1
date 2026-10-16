import { RoundedBox } from '@react-three/drei'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'

/**
 * Capa 4: PCB — el cerebro.
 * Placa verde con el sensor FLUX-30K delante, el MCU detrás, LEDs RGB
 * direccionables (emissive) y detalles de cobre. Todos los componentes van
 * como hijos del grupo para que viajen juntos durante la descomposición.
 */
export function Pcb() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  return (
    <Parte desplazamiento={[0, 0.88, 0]} retardo={0.16}>
      {/* Placa */}
      <RoundedBox args={[0.5, 0.014, 0.92]} radius={0.006} smoothness={3} position={[0, 0.205, 0]}>
        <meshStandardMaterial color="#0b3d2a" roughness={0.55} metalness={0.15} />
      </RoundedBox>

      {/* MCU */}
      <RoundedBox args={[0.13, 0.035, 0.13]} radius={0.004} smoothness={3} position={[0, 0.23, -0.22]}>
        <meshStandardMaterial color="#14161c" roughness={0.35} metalness={0.5} />
      </RoundedBox>

      {/* Sensor óptico */}
      <RoundedBox args={[0.11, 0.03, 0.11]} radius={0.004} smoothness={3} position={[0, 0.227, 0.24]}>
        <meshStandardMaterial color="#05070b" roughness={0.3} metalness={0.4} />
      </RoundedBox>
      {/* Lente del sensor (brillo tenue) */}
      <mesh position={[0, 0.244, 0.24]}>
        <boxGeometry args={[0.05, 0.006, 0.05]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={2.2} />
      </mesh>

      {/* Condensadores */}
      <mesh position={[0.17, 0.24, 0.02]}>
        <cylinderGeometry args={[0.028, 0.028, 0.05, 16]} />
        <meshStandardMaterial color="#1b1f27" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[-0.17, 0.24, 0.02]}>
        <cylinderGeometry args={[0.028, 0.028, 0.05, 16]} />
        <meshStandardMaterial color="#1b1f27" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Pads de cobre */}
      {(
        [
          [0.18, 0.214, -0.32],
          [-0.18, 0.214, -0.32],
          [0.18, 0.214, 0.34],
          [-0.18, 0.214, 0.34],
        ] as [number, number, number][]
      ).map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.05, 0.005, 0.07]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.25} metalness={1} />
        </mesh>
      ))}

      {/* LEDs RGB direccionables */}
      <mesh position={[0, 0.216, 0.44]}>
        <boxGeometry args={[0.018, 0.01, 0.018]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={5} />
      </mesh>
      <mesh position={[0.16, 0.216, 0.08]}>
        <boxGeometry args={[0.018, 0.01, 0.018]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={5} />
      </mesh>
      <mesh position={[-0.16, 0.216, -0.1]}>
        <boxGeometry args={[0.018, 0.01, 0.018]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={5} />
      </mesh>

      {/* Tira de luz trasera (se filtra por la carcasa) */}
      <mesh position={[0, 0.216, -0.42]}>
        <boxGeometry args={[0.42, 0.008, 0.02]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={3.5} />
      </mesh>

      {/* Puerto USB-C */}
      <RoundedBox args={[0.09, 0.02, 0.06]} radius={0.006} smoothness={3} position={[0, 0.2, 0.48]}>
        <meshStandardMaterial color="#262b34" roughness={0.35} metalness={0.8} />
      </RoundedBox>
    </Parte>
  )
}
