import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Vector2 } from 'three'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { aplicarOnda, claveOnda } from '../sobrecarga'
import { Parte } from './Parte'
import { crearMapaNormalTejido } from './texturas'

// Patas doradas del MCU [x, y, z]: 4 por lado, como un QFN real. Las de los
// costados miran en X y las del frente/atrás en Z.
const PATAS_X: [number, number, number][] = [-0.276, -0.252, -0.228, -0.204].flatMap(
  (z) =>
    [
      [-0.055, 0.184, z],
      [0.055, 0.184, z],
    ] as [number, number, number][],
)
const PATAS_Z: [number, number, number][] = [-0.036, -0.012, 0.012, 0.036].flatMap(
  (x) =>
    [
      [x, 0.184, -0.297],
      [x, 0.184, -0.183],
    ] as [number, number, number][],
)

// Pistas de cobre [x, z, largoX, largoZ]: 12 tramos = 6 recorridos rectos
// con un codo, como el enrutado de una placa de doble cara.
const PISTAS: [number, number, number, number][] = [
  [0.195, 0.02, 0.004, 0.36],
  [0.155, 0.2, 0.084, 0.004],
  [-0.195, -0.04, 0.004, 0.32],
  [-0.158, 0.12, 0.078, 0.004],
  [0.156, -0.29, 0.004, 0.22],
  [0.1, -0.4, 0.112, 0.004],
  [-0.155, -0.3, 0.004, 0.2],
  [-0.1, -0.4, 0.11, 0.004],
  [0.075, 0.3, 0.004, 0.16],
  [0.144, 0.38, 0.144, 0.004],
  [-0.075, 0.26, 0.004, 0.14],
  [-0.13, 0.33, 0.114, 0.004],
]

// Pads de tornillo con aro en las cuatro esquinas.
const PADS: [number, number][] = [
  [0.18, -0.36],
  [-0.18, -0.36],
  [0.18, 0.36],
  [-0.18, 0.36],
]

// LEDs RGB direccionables repartidos por la placa. Ninguno supera y=0.20
// en el frontal (z>0.40), donde la nariz del casco queda muy baja.
const LEDS: [number, number][] = [
  [0.155, -0.1],
  [-0.155, 0.06],
  [0.1, 0.2],
  [0, 0.4],
]

// Header 2x5 de pines dorados junto a la rueda (z≈0.30). No invade la zona
// z 0.34→0.48 en x ±0.05: ahí baja el encoder de la rueda, que es otra capa.
const PINES: [number, number][] = [-0.04, -0.02, 0, 0.02, 0.04].flatMap((x) =>
  [0.285, 0.305].map((z) => [x, z] as [number, number]),
)

// Soportes: torres cortas que bajan la placa hasta la base.
const SOPORTES: [number, number, number][] = [
  [0.17, 0.139, -0.3],
  [-0.17, 0.139, -0.3],
  [0, 0.139, 0.36],
]

/**
 * Capa 4: PCB — el cerebro.
 * Placa FR4 NEGRA mate (los ratones gaming reales usan mascarilla oscura,
 * no verde) montada sobre torres cortas. El sensor FLUX-30K va delante con
 * lente redonda y aro, el MCU detrás con patas visibles, y alrededor el
 * pasivo de una placa real: cristal, condensadores, regulador, header de
 * pines junto a la rueda, pistas de cobre, pads de tornillo y LEDs RGB.
 */
export function Pcb() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)
  // El tejido de fibra de vidrio se construye una sola vez: es el mismo en
  // todas las placas y no depende del acento.
  const { tejido, escalaTejido } = useMemo(
    () => ({ tejido: crearMapaNormalTejido({ repeticion: 38 }), escalaTejido: new Vector2(0.35, 0.35) }),
    [],
  )

  return (
    <Parte desplazamiento={[0, 0.88, 0]} retardo={0.32}>
      {/* Placa FR4 negra mate: y 0.169→0.181, z −0.44→+0.44. De ancho se
          queda en ±0.20: hacia los rincones traseros el casco baja de 0.19
          y las esquinas de la placa asomarían por los flancos. */}
      <RoundedBox args={[0.4, 0.012, 0.88]} radius={0.004} smoothness={3} position={[0, 0.175, 0]}>
        <meshStandardMaterial
          color="#0e1116"
          roughness={0.72}
          metalness={0.15}
          normalMap={tejido}
          normalScale={escalaTejido}
        />
      </RoundedBox>

      {SOPORTES.map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 12]} />
          <meshStandardMaterial color="#22262e" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      {/* MCU de 8 000 Hz: chip con patas en los 4 lados y marca de pin 1 */}
      <RoundedBox args={[0.1, 0.028, 0.1]} radius={0.003} smoothness={3} position={[0, 0.195, -0.24]}>
        <meshStandardMaterial color="#14161c" roughness={0.35} metalness={0.5} />
      </RoundedBox>
      {PATAS_X.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.016, 0.004, 0.006]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
        </mesh>
      ))}
      {PATAS_Z.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.006, 0.004, 0.016]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
        </mesh>
      ))}
      <mesh position={[-0.038, 0.2094, -0.278]}>
        <cylinderGeometry args={[0.0055, 0.0055, 0.0018, 12]} />
        <meshStandardMaterial color="#cfd6dd" roughness={0.5} />
      </mesh>

      {/* Sensor óptico FLUX-30K: lente redonda emisiva rodeada de aro */}
      <RoundedBox args={[0.1, 0.03, 0.1]} radius={0.004} smoothness={3} position={[0, 0.19, 0.1]}>
        <meshStandardMaterial color="#05070b" roughness={0.3} metalness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.2055, 0.1]}>
        <cylinderGeometry args={[0.034, 0.034, 0.005, 20]} />
        <meshStandardMaterial color="#b9c2cc" roughness={0.25} metalness={1} />
      </mesh>
      <mesh position={[0, 0.2065, 0.1]}>
        <cylinderGeometry args={[0.025, 0.025, 0.007, 20]} />
        <meshStandardMaterial
          color="#05070b"
          emissive={hex}
          emissiveIntensity={2.4}
          onBeforeCompile={aplicarOnda}
          customProgramCacheKey={claveOnda}
        />
      </mesh>

      {/* LED de iluminación (emisivo tenue) y fotodetector, junto al sensor */}
      <mesh position={[0.075, 0.185, 0.1]}>
        <boxGeometry args={[0.016, 0.008, 0.016]} />
        <meshStandardMaterial
          color="#05070b"
          emissive={hex}
          emissiveIntensity={1.1}
          onBeforeCompile={aplicarOnda}
          customProgramCacheKey={claveOnda}
        />
      </mesh>
      <mesh position={[-0.075, 0.184, 0.1]}>
        <boxGeometry args={[0.014, 0.006, 0.014]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Cristal oscilador metálico junto al MCU */}
      <RoundedBox args={[0.03, 0.009, 0.016]} radius={0.002} smoothness={3} position={[-0.09, 0.1855, -0.14]}>
        <meshStandardMaterial color="#c7ccd2" roughness={0.18} metalness={1} />
      </RoundedBox>

      {/* Condensadores electrolíticos (cilindros) */}
      <mesh position={[0.148, 0.196, -0.3]}>
        <cylinderGeometry args={[0.016, 0.016, 0.03, 16]} />
        <meshStandardMaterial color="#2a2e36" roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={[-0.148, 0.196, -0.24]}>
        <cylinderGeometry args={[0.016, 0.016, 0.03, 16]} />
        <meshStandardMaterial color="#2a2e36" roughness={0.35} metalness={0.85} />
      </mesh>

      {/* Condensadores cerámicos (cajas color óxido) */}
      <mesh position={[-0.115, 0.1865, -0.095]}>
        <boxGeometry args={[0.024, 0.012, 0.013]} />
        <meshStandardMaterial color="#8a5a2b" roughness={0.55} />
      </mesh>
      <mesh position={[0.112, 0.1865, -0.155]}>
        <boxGeometry args={[0.024, 0.012, 0.013]} />
        <meshStandardMaterial color="#8a5a2b" roughness={0.55} />
      </mesh>

      {/* Regulador de voltaje con lengüeta metálica */}
      <mesh position={[0.12, 0.186, -0.06]}>
        <boxGeometry args={[0.032, 0.011, 0.02]} />
        <meshStandardMaterial color="#17191e" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0.118, 0.1925, -0.06]}>
        <boxGeometry args={[0.014, 0.0025, 0.014]} />
        <meshStandardMaterial color="#b9c2cc" roughness={0.25} metalness={1} />
      </mesh>

      {/* Header 2x5 de programación/debug, junto a la rueda */}
      <RoundedBox args={[0.096, 0.006, 0.048]} radius={0.002} smoothness={2} position={[0, 0.183, 0.295]}>
        <meshStandardMaterial color="#14161c" roughness={0.5} metalness={0.3} />
      </RoundedBox>
      {PINES.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.19, z]}>
          <boxGeometry args={[0.008, 0.014, 0.008]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.25} metalness={1} />
        </mesh>
      ))}

      {/* Pistas de cobre: trazos rectos con codo sobre la cara superior */}
      {PISTAS.map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[x, 0.1815, z]}>
          <boxGeometry args={[sx, 0.0014, sz]} />
          <meshStandardMaterial color="#a97a3f" roughness={0.3} metalness={1} />
        </mesh>
      ))}

      {/* Pads de tornillo: aro dorado con el centro hundido */}
      {PADS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.1825, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.011, 0.0025, 8, 20]} />
            <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
          </mesh>
          <mesh position={[0, 0.1824, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.0016, 12]} />
            <meshStandardMaterial color="#05070b" roughness={0.6} metalness={0.4} />
          </mesh>
        </group>
      ))}

      {/* LEDs RGB direccionables (paquete claro + dado emisivo) */}
      {LEDS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.182, 0]}>
            <boxGeometry args={[0.02, 0.003, 0.02]} />
            <meshStandardMaterial color="#dfe3e8" roughness={0.4} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.185, 0]}>
            <boxGeometry args={[0.012, 0.005, 0.012]} />
            <meshStandardMaterial
              color="#05070b"
              emissive={hex}
              emissiveIntensity={5}
              onBeforeCompile={aplicarOnda}
              customProgramCacheKey={claveOnda}
            />
          </mesh>
        </group>
      ))}

      {/* Difusor de luz trasero sobre pedestal oscuro (pensado para filtrarse
          por la carcasa). Las dos piezas se quedan en ±0.19: hacia los
          rincones el casco baja hasta y≈0.20 y el filo asomaría por los
          flancos traseros. */}
      <mesh position={[0, 0.196, -0.42]}>
        <boxGeometry args={[0.38, 0.03, 0.018]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.2155, -0.42]}>
        <boxGeometry args={[0.38, 0.008, 0.02]} />
        <meshStandardMaterial
          color="#05070b"
          emissive={hex}
          emissiveIntensity={3.5}
          onBeforeCompile={aplicarOnda}
          customProgramCacheKey={claveOnda}
        />
      </mesh>

      {/* Puerto USB-C frontal: chapa metálica hueca (4 placas) con lengüeta
          dorada dentro. Vive en y≈0.135 y z≈0.44→0.50, bajo el marco oscuro
          de la nariz; centrado en z=0.4825 para no rebasar la envolvente. */}
      <mesh position={[0, 0.1465, 0.4825]}>
        <boxGeometry args={[0.075, 0.003, 0.035]} />
        <meshStandardMaterial color="#a7aeb8" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.1235, 0.4825]}>
        <boxGeometry args={[0.075, 0.003, 0.035]} />
        <meshStandardMaterial color="#a7aeb8" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0.036, 0.135, 0.4825]}>
        <boxGeometry args={[0.003, 0.023, 0.035]} />
        <meshStandardMaterial color="#a7aeb8" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[-0.036, 0.135, 0.4825]}>
        <boxGeometry args={[0.003, 0.023, 0.035]} />
        <meshStandardMaterial color="#a7aeb8" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.135, 0.4805]}>
        <boxGeometry args={[0.05, 0.005, 0.03]} />
        <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
      </mesh>

      {/* Pestaña de la placa que baja hasta el conector */}
      <mesh position={[0, 0.1545, 0.459]}>
        <boxGeometry args={[0.08, 0.03, 0.014]} />
        <meshStandardMaterial
          color="#0e1116"
          roughness={0.72}
          metalness={0.15}
          normalMap={tejido}
          normalScale={escalaTejido}
        />
      </mesh>
    </Parte>
  )
}
