import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { CatmullRomCurve3, TubeGeometry, Vector2, Vector3 } from 'three'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { aplicarOnda, claveOnda } from '../sobrecarga'
import { Parte } from './Parte'
import { crearMapaNormal } from './texturas'

/** Cable fino (r≈0.004) a lo largo de una spline CatmullRom de 4 puntos. */
function crearCable(puntos: [number, number, number][]): TubeGeometry {
  const curva = new CatmullRomCurve3(puntos.map(([x, y, z]) => new Vector3(x, y, z)))
  return new TubeGeometry(curva, 20, 0.004, 6, false)
}

// Líneas "impresas" de la etiqueta [x, z, largo]: geometría fina que sugiere
// el rótulo VOLTA sin usar texto 3D.
const LINEAS_ETIQUETA: [number, number, number][] = [
  [-0.002, -0.228, 0.11],
  [0.01, -0.208, 0.082],
  [-0.006, -0.188, 0.096],
]

// Cinta kapton ámbar cruzando la celda por detrás y por delante de la banda.
const KAPTON: number[] = [-0.36, -0.055]

// Antena serpenteante del módulo 2.4G: barras verticales con puentes
// alternos delante/detrás, como la pista impresa de una PCB real.
const BARRAS_ANTENA: number[] = [0.092, 0.102, 0.112, 0.122, 0.132]
const PUENTES_ANTENA: [number, number][] = [
  [0.097, 0.1128],
  [0.107, 0.1012],
  [0.117, 0.1128],
  [0.127, 0.1012],
]
const ALIMENTACION_ANTENA: [number, number, number, number][] = [
  [0.095, 0.07, 0.024, 0.0026],
  [0.107, 0.0825, 0.0026, 0.026],
  [0.119, 0.095, 0.026, 0.0026],
]

// Pads dorados de esquina del módulo inalámbrico.
const PADS_MODULO: [number, number][] = [
  [0.064, 0.054],
  [0.136, 0.054],
  [0.064, 0.106],
  [0.136, 0.106],
]

/**
 * Capa 5: batería LiPo + módulo inalámbrico 2.4G.
 * Celda rectangular con envoltura plateada sobre lámina aislante, etiqueta
 * impresa, pestañas y cables rojo/negro hacia el JST, cinta kapton ámbar y
 * la placa hija del receptor con antena serpenteante. Todo bajo la PCB:
 * ningún detalle pasa de y=0.169 (el fondo de la placa).
 */
export function Bateria() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  // Cables: pestaña → conector JST. Se calculan una vez (geometría estática).
  const cableRojo = useMemo(
    () =>
      crearCable([
        [0.06, 0.1405, 0.022],
        [0.078, 0.128, 0.04],
        [0.05, 0.112, 0.052],
        [0.028, 0.108, 0.045],
      ]),
    [],
  )
  const cableNegro = useMemo(
    () =>
      crearCable([
        [-0.06, 0.1405, 0.022],
        [-0.078, 0.127, 0.042],
        [-0.02, 0.111, 0.058],
        [0.012, 0.108, 0.046],
      ]),
    [],
  )

  // Film retráctil de la celda: arrugas suaves de sellado al vacío que rompen
  // los reflejos del envoltorio metálico.
  const filmCelda = useMemo(
    () => ({
      grano: crearMapaNormal({ repeticion: 5, fuerza: 2, manchas: 1.4, semilla: 19 }),
      escala: new Vector2(0.3, 0.3),
    }),
    [],
  )

  return (
    <Parte desplazamiento={[0, 0.5, -0.06]} retardo={0.44}>
      {/* Lámina aislante oscura: apoya la celda sobre el fondo (y=0.098) */}
      <mesh position={[0, 0.0995, -0.2]}>
        <boxGeometry args={[0.34, 0.003, 0.44]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Celda LiPo: y 0.102→0.154, z −0.40→0.0, centrada (0, 0.128, −0.20) */}
      <RoundedBox args={[0.3, 0.052, 0.4]} radius={0.012} smoothness={4} position={[0, 0.128, -0.2]}>
        <meshStandardMaterial
          color="#d9dfe6"
          roughness={0.32}
          metalness={0.75}
          normalMap={filmCelda.grano}
          normalScale={filmCelda.escala}
        />
      </RoundedBox>

      {/* Banda de etiqueta envolviendo la celda */}
      <RoundedBox args={[0.304, 0.056, 0.16]} radius={0.012} smoothness={4} position={[0, 0.128, -0.2]}>
        <meshStandardMaterial color="#1a1e26" roughness={0.5} metalness={0.3} />
      </RoundedBox>
      {LINEAS_ETIQUETA.map(([x, z, largo], i) => (
        <mesh key={i} position={[x, 0.1562, z]}>
          <boxGeometry args={[largo, 0.0014, 0.0075]} />
          <meshStandardMaterial color="#cfd8e0" roughness={0.5} metalness={0.05} />
        </mesh>
      ))}

      {/* Cinta kapton ámbar semitransparente cruzando la celda */}
      {KAPTON.map((z, i) => (
        <mesh key={i} position={[0, 0.128, z]}>
          <boxGeometry args={[0.304, 0.0555, 0.012]} />
          <meshStandardMaterial color="#c8862c" roughness={0.35} transparent opacity={0.55} />
        </mesh>
      ))}

      {/* Pestañas metálicas (+ y −) asomando por el borde delantero */}
      {[0.06, -0.06].map((x, i) => (
        <mesh key={i} position={[x, 0.138, 0.008]}>
          <boxGeometry args={[0.016, 0.0015, 0.028]} />
          <meshStandardMaterial color="#cdd3da" roughness={0.2} metalness={1} />
        </mesh>
      ))}
      {/* Marcas de polaridad sobre la envoltura, junto a las pestañas */}
      <mesh position={[0.06, 0.1545, -0.018]}>
        <boxGeometry args={[0.006, 0.0015, 0.006]} />
        <meshStandardMaterial color="#b8402f" roughness={0.5} />
      </mesh>
      <mesh position={[-0.06, 0.1545, -0.018]}>
        <boxGeometry args={[0.006, 0.0015, 0.006]} />
        <meshStandardMaterial color="#22262c" roughness={0.5} />
      </mesh>

      {/* Cables soldados a las pestañas: rojo (+) y negro (−) hasta el JST */}
      <mesh geometry={cableRojo}>
        <meshStandardMaterial color="#b8352a" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh geometry={cableNegro}>
        <meshStandardMaterial color="#131519" roughness={0.5} metalness={0.1} />
      </mesh>
      {[0.06, -0.06].map((x, i) => (
        <mesh key={i} position={[x, 0.1405, 0.024]}>
          <sphereGeometry args={[0.0055, 8, 6]} />
          <meshStandardMaterial color="#b9c2cc" roughness={0.35} metalness={0.9} />
        </mesh>
      ))}

      {/* Conector JST blanco con contactos dorados, sobre el fondo */}
      <RoundedBox args={[0.026, 0.016, 0.014]} radius={0.0025} smoothness={3} position={[0.02, 0.106, 0.052]}>
        <meshStandardMaterial color="#e6e2d8" roughness={0.45} metalness={0.05} />
      </RoundedBox>
      {[0.013, 0.027].map((x, i) => (
        <mesh key={i} position={[x, 0.103, 0.0455]}>
          <boxGeometry args={[0.0045, 0.003, 0.01]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
        </mesh>
      ))}

      {/* Módulo inalámbrico 2.4G: placa hija FR4 sobre el fondo, en (0.10, 0.08) */}
      <RoundedBox args={[0.09, 0.004, 0.07]} radius={0.0015} smoothness={2} position={[0.1, 0.1, 0.08]}>
        <meshStandardMaterial color="#10231a" roughness={0.55} metalness={0.2} />
      </RoundedBox>
      {PADS_MODULO.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1022, z]}>
          <boxGeometry args={[0.007, 0.0008, 0.007]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
        </mesh>
      ))}
      {/* Chip de radio + cristal del módulo */}
      <mesh position={[0.075, 0.1036, 0.062]}>
        <boxGeometry args={[0.016, 0.0035, 0.012]} />
        <meshStandardMaterial color="#14161c" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0.092, 0.103, 0.06]}>
        <boxGeometry args={[0.007, 0.0022, 0.005]} />
        <meshStandardMaterial color="#c7ccd2" roughness={0.2} metalness={1} />
      </mesh>

      {/* Antena serpenteante de cobre: barras + puentes + alimentación */}
      {BARRAS_ANTENA.map((x, i) => (
        <mesh key={i} position={[x, 0.1022, 0.107]}>
          <boxGeometry args={[0.0028, 0.0008, 0.014]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
        </mesh>
      ))}
      {PUENTES_ANTENA.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1022, z]}>
          <boxGeometry args={[0.0102, 0.0008, 0.0026]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
        </mesh>
      ))}
      {ALIMENTACION_ANTENA.map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[x, 0.1022, z]}>
          <boxGeometry args={[sx, 0.0008, sz]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.3} metalness={1} />
        </mesh>
      ))}

      {/* LED de estado: poste propio junto al JST, lejos de la celda */}
      <mesh position={[-0.045, 0.104, 0.064]}>
        <boxGeometry args={[0.014, 0.012, 0.014]} />
        <meshStandardMaterial color="#17191e" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[-0.045, 0.112, 0.064]}>
        <boxGeometry args={[0.009, 0.004, 0.009]} />
        <meshStandardMaterial
          color="#05070b"
          emissive={hex}
          emissiveIntensity={4}
          onBeforeCompile={aplicarOnda}
          customProgramCacheKey={claveOnda}
        />
      </mesh>
    </Parte>
  )
}
