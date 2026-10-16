import { RoundedBox } from '@react-three/drei'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'

/**
 * Capa 5: batería LiPo + módulo inalámbrico.
 * Al descomponer sube por encima de la base, revelando el conector y el
 * LED de estado. Delgada a propósito: en el montaje vive entre la base y
 * la PCB.
 */
export function Bateria() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  return (
    <Parte desplazamiento={[0, 0.5, -0.06]} retardo={0.08}>
      {/* Celda LiPo */}
      <RoundedBox args={[0.34, 0.06, 0.46]} radius={0.014} smoothness={4} position={[0, 0.145, -0.16]}>
        <meshStandardMaterial color="#d9dfe6" roughness={0.32} metalness={0.75} />
      </RoundedBox>

      {/* Banda de etiqueta */}
      <RoundedBox args={[0.345, 0.058, 0.2]} radius={0.012} smoothness={4} position={[0, 0.145, -0.16]}>
        <meshStandardMaterial color="#1a1e26" roughness={0.5} metalness={0.3} />
      </RoundedBox>

      {/* Conector hacia la PCB */}
      <RoundedBox args={[0.06, 0.028, 0.04]} radius={0.008} smoothness={4} position={[0.09, 0.19, 0.05]}>
        <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
      </RoundedBox>

      {/* LED de estado */}
      <mesh position={[0.13, 0.177, -0.34]}>
        <boxGeometry args={[0.016, 0.008, 0.016]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={4} />
      </mesh>
    </Parte>
  )
}
