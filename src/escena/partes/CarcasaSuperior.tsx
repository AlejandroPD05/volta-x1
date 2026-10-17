import { useMemo } from 'react'
import {
  BackSide,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector2,
} from 'three'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'
import { crearTexturaPanal } from './panal'
import { crearMapaNormal, crearTexturaRugosidad } from './texturas'
import { COLA_Z, NARIZ_Z, Z_CORTE, crearMallaCasco } from './geometriaRaton'
import { parchearOnda } from '../sobrecarga'

/**
 * Capa 1 (la superior): el casco.
 *
 * Una sola superficie continua (loft paramétrico, ver `geometriaRaton.ts`)
 * repartida como en un ratón de gaming real:
 * - Cubierta trasera: de la cola a la línea de corte.
 * - Botones principales: las dos mitades delanteras del mismo loft,
 *   separadas por la ranura central que se abre en óvalo en el pozo de la
 *   rueda (por eso el hueco se ve en V y no como un canal constante).
 * - Cuna: franja oscura bajo la ranura, para que el corte parezca profundo.
 * - Pared interior con nervios de panal (la seña de la marca), visible al
 *   mirar el casco por debajo durante el despiece.
 * Es la primera pieza en separarse —como al abrir un ratón real—: se levanta
 * y el resto de capas la siguen desde dentro.
 */
export function CarcasaSuperior() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  const piezas = useMemo(() => {
    // Grano soft-touch (normales) + satinado del roce (rugosidad): la pareja
    // que convierte el plástico plano en una superficie real. El grano es FINO
    // (repeat 18 ≈ 0,4 mm de mancha): en un soft-touch premium se intuye en el
    // brillo, no se ve como estuco.
    const grano = crearMapaNormal({ repeticion: 18, fuerza: 2.1, manchas: 0.55, semilla: 7 })
    const satinado = crearTexturaRugosidad({ contraste: 0.18, moteado: 0.02 })
    const panal = crearTexturaPanal(512, 5)

    const materialCasco = new MeshPhysicalMaterial({
      color: '#191c22',
      roughness: 0.66,
      metalness: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.44,
      // El satinado también modula el barniz: donde la mano pule, el brillo
      // se abre en mancha, no en un degradado perfecto.
      roughnessMap: satinado,
      clearcoatRoughnessMap: satinado,
      normalMap: grano,
      normalScale: new Vector2(0.26, 0.26),
      // Un velo de "sheen": el soft-touch real tiene un brillo sedoso a rasante.
      sheen: 0.1,
      sheenColor: '#98a2b5',
      sheenRoughness: 0.62,
    })
    // Los botones se miran por debajo al descomponerse: doble cara.
    const materialBoton = materialCasco.clone()
    materialBoton.side = DoubleSide

    const materialInterior = new MeshStandardMaterial({
      color: '#0c0e12',
      roughness: 0.85,
      metalness: 0.1,
      bumpMap: panal,
      bumpScale: 0.6,
      side: BackSide,
    })
    const materialCuna = new MeshStandardMaterial({
      color: '#08090c',
      roughness: 0.9,
      metalness: 0,
      side: DoubleSide,
    })
    const materialPuerto = new MeshStandardMaterial({
      color: '#0a0c10',
      roughness: 0.6,
      metalness: 0.25,
    })
    const materialLengueta = new MeshStandardMaterial({
      color: '#b9c2cb',
      roughness: 0.35,
      metalness: 0.9,
    })

    return {
      materialCasco,
      materialBoton,
      materialInterior,
      materialCuna,
      materialPuerto,
      materialLengueta,
      cubierta: crearMallaCasco({
        sector: 'completo',
        zIni: COLA_Z,
        zFin: Z_CORTE - 0.007,
        tapas: true,
      }),
      botonDer: crearMallaCasco({
        sector: 'derecho',
        zIni: Z_CORTE + 0.007,
        zFin: NARIZ_Z,
        tapas: true,
      }),
      botonIzq: crearMallaCasco({
        sector: 'izquierdo',
        zIni: Z_CORTE + 0.007,
        zFin: NARIZ_Z,
        tapas: true,
      }),
      cuna: crearMallaCasco({
        sector: 'cuna',
        zIni: 0.09,
        zFin: NARIZ_Z - 0.006,
        hundido: 0.011,
        margenCuna: 0.017,
      }),
      // Pared interior: misma planta encogida; se renderiza por su cara
      // interna (BackSide), de modo que desde fuera queda oculta.
      interior: crearMallaCasco({
        sector: 'completo',
        zIni: COLA_Z + 0.006,
        zFin: NARIZ_Z - 0.008,
        escalaAncho: 0.93,
        escalaAlto: 0.9,
        pasosSeccion: 40,
      }),
    }
  }, [])

  // El logo es lo único del casco que depende del acento: se recrea solo al
  // cambiar de color (el loft, el panal y el resto de materiales se construyen
  // una única vez).
  const materialLogo = useMemo(
    () =>
      parchearOnda(
        new MeshStandardMaterial({
          color: '#05070b',
          emissive: hex,
          emissiveIntensity: 3.6,
          roughness: 0.4,
        }),
      ),
    [hex],
  )

  return (
    <Parte desplazamiento={[0, 1.95, -0.04]} retardo={0} giro={[0, 0, 0.05]}>
      {/* Cubierta trasera */}
      <mesh geometry={piezas.cubierta} material={piezas.materialCasco} />

      {/* Botones principales: dos mitades del mismo casco */}
      <mesh geometry={piezas.botonDer} material={piezas.materialBoton} />
      <mesh geometry={piezas.botonIzq} material={piezas.materialBoton} />

      {/* Cuna oscura bajo la ranura entre botones */}
      <mesh geometry={piezas.cuna} material={piezas.materialCuna} />

      {/* Pared interior con nervios de panal */}
      <mesh geometry={piezas.interior} material={piezas.materialInterior} />

      {/* Logo V emisivo sobre la cresta, inclinado con la pendiente del
          casco (≈10°) y con las barras abriéndose hacia la nariz. */}
      <mesh
        material={materialLogo}
        position={[-0.019, 0.368, -0.285]}
        rotation={[-0.17, -0.45, 0]}
      >
        <boxGeometry args={[0.013, 0.006, 0.105]} />
      </mesh>
      <mesh
        material={materialLogo}
        position={[0.019, 0.368, -0.285]}
        rotation={[-0.17, 0.45, 0]}
      >
        <boxGeometry args={[0.013, 0.006, 0.105]} />
      </mesh>

      {/* Puerto USB-C de carga: muñón oscuro en la punta de la nariz con la
          lengüeta metálica asomando. */}
      <mesh material={piezas.materialPuerto} position={[0, 0.125, 0.615]}>
        <boxGeometry args={[0.03, 0.018, 0.02]} />
      </mesh>
      <mesh material={piezas.materialLengueta} position={[0, 0.125, 0.619]}>
        <boxGeometry args={[0.018, 0.007, 0.016]} />
      </mesh>
    </Parte>
  )
}
