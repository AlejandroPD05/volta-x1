import { RoundedBox } from '@react-three/drei'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'

/**
 * Capa 6 (la más baja): base del ratón.
 * Base rígida + cuatro patines de PTFE embutidos y dos tiras de luz
 * laterales (mismo lenguaje que la carcasa) para que el conjunto montado
 * se lea como una sola pieza. Esta capa no se desplaza: es el "suelo" del
 * despiece y ancla visualmente la explosión.
 */
export function CarcasaInferior() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  return (
    <Parte desplazamiento={[0, -0.02, 0]} retardo={0}>
      {/* Base: llega hasta el frontal para que el cuerpo no "flote" sobre
          ella (el desbordamiento creaba una muesca que parecía un hueco). */}
      <RoundedBox args={[0.545, 0.09, 1.11]} radius={0.04} smoothness={4} position={[0, 0.065, 0.045]}>
        <meshStandardMaterial color="#14171d" roughness={0.5} metalness={0.3} />
      </RoundedBox>

      {/* Tiras de luz laterales de la base */}
      <mesh position={[0.2735, 0.055, 0.045]}>
        <boxGeometry args={[0.006, 0.016, 0.6]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={1.3} />
      </mesh>
      <mesh position={[-0.2735, 0.055, 0.045]}>
        <boxGeometry args={[0.006, 0.016, 0.6]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={1.3} />
      </mesh>

      {/* Patines de PTFE: dos grandes delante/detrás y dos laterales */}
      <RoundedBox args={[0.42, 0.02, 0.13]} radius={0.009} smoothness={4} position={[0, 0.01, 0.46]}>
        <meshStandardMaterial color="#9aa4b0" roughness={0.5} metalness={0.08} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.02, 0.13]} radius={0.009} smoothness={4} position={[0, 0.01, -0.4]}>
        <meshStandardMaterial color="#9aa4b0" roughness={0.5} metalness={0.08} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.02, 0.22]} radius={0.009} smoothness={4} position={[0.2, 0.01, 0.06]}>
        <meshStandardMaterial color="#9aa4b0" roughness={0.5} metalness={0.08} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.02, 0.22]} radius={0.009} smoothness={4} position={[-0.2, 0.01, 0.06]}>
        <meshStandardMaterial color="#9aa4b0" roughness={0.5} metalness={0.08} />
      </RoundedBox>
    </Parte>
  )
}
