import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Path,
  Shape,
  Vector2,
  Vector3,
} from 'three'

/**
 * Geometría paramétrica del ratón.
 *
 * Un chasis real no es una suma de cajas: es un loft continuo. Se define la
 * planta (vista superior, media anchura en función de Z), el perfil (vista
 * lateral, altura de la cresta en función de Z) y una sección transversal
 * tipo superelipse que se interpola a lo largo de todo el cuerpo. Con eso se
 * tessela una BufferGeometry para cada pieza: cubierta trasera, botones
 * izquierdo/derecho (cortados por la ranura central), cuna oscura bajo el
 * hueco y el interior con nervios.
 *
 * Convención: z+ = nariz, z- = cola, y = altura desde el suelo.
 * Cotas tomadas de un ratón tipo HyperX Pulsefire Surge (120 × 63 × 41 mm):
 * la escala de la escena es ≈ 10.8 cm por unidad.
 */

// --- Cotas maestras ---
export const NARIZ_Z = 0.622
export const COLA_Z = -0.542
/** Línea de unión entre el casco superior y la base. */
export const SEPARACION_Y = 0.105
/** Frontera entre los botones principales y la cubierta trasera. */
export const Z_CORTE = 0.105

/** Pozo de la rueda: el hueco central entre botones se ensancha aquí. */
export const RUEDA_Z = 0.415
/** Radio del neumático. Medido para que la rueda asome ~3 mm por el óvalo,
    como en el Surge, sin hundirse en la PCB (fondo en y = 0.184). */
export const RUEDA_RADIO = 0.044
export const RUEDA_CENTRO_Y = 0.228

/** Separación de la superficie del casco al generar la pared interior. */
export const GROSOR_PARED = 0.035

/**
 * Hueco central entre los botones (anchura total) según z: una ranura fina
 * en toda la línea de clic que se abre en óvalo alrededor de la rueda.
 */
export function huecoCentral(z: number): number {
  const d = Math.abs(z - RUEDA_Z) / 0.098
  const pozo = d < 1 ? 0.09 * (1 - d * d) : 0
  return Math.max(0.0135, pozo)
}

// Planta: media anchura (w) de cada sección a lo largo de Z (cola → nariz).
// El frente es ancho y "chato" (esquinas de radio grande, como el Surge);
// la cola se cierra en un óvalo amplio. La última sección no llega a cero:
// remata en un tramo romo (≈10 mm) para que el abanico de cierre sea una
// cúpula ancha y no un pico afilado que se lea como un corte.
const PLANTA: Array<[number, number]> = [
  [COLA_Z, 0.05],
  [-0.525, 0.125],
  [-0.49, 0.178],
  [-0.43, 0.219],
  [-0.34, 0.251],
  [-0.24, 0.271],
  [-0.12, 0.284],
  [0.0, 0.29],
  [0.12, 0.291],
  [0.25, 0.288],
  [0.35, 0.281],
  [0.43, 0.266],
  [0.51, 0.252],
  [0.56, 0.226],
  [0.595, 0.176],
  [0.612, 0.115],
  [NARIZ_Z, 0.03],
]

// Perfil: altura de la cresta (desde el suelo) a lo largo de Z (cola → nariz).
const PERFIL: Array<[number, number]> = [
  [COLA_Z, 0.232],
  [-0.52, 0.268],
  [-0.47, 0.306],
  [-0.4, 0.336],
  [-0.32, 0.358],
  [-0.23, 0.374],
  [-0.14, 0.379],
  [-0.06, 0.373],
  [0.02, 0.36],
  [0.1, 0.34],
  [0.18, 0.32],
  [0.26, 0.298],
  [0.34, 0.272],
  [0.42, 0.242],
  [0.5, 0.206],
  [0.55, 0.182],
  [0.6, 0.16],
  [NARIZ_Z, 0.148],
]

/**
 * Exponente de la superelipse de la sección transversal: más alto = paredes
 * más verticales y techo más plano (un ratón real no es un tubo).
 */
const EXPONENTE = 2.4

/** Muestreador de una tabla (z, valor) con spline Catmull-Rom. */
function muestreador(tabla: Array<[number, number]>): (z: number) => number {
  const curva = new CatmullRomCurve3(tabla.map(([z, v]) => new Vector3(z, v, 0)))
  const pasos = 900
  const zs: number[] = []
  const vs: number[] = []
  for (let i = 0; i <= pasos; i++) {
    const p = curva.getPoint(i / pasos)
    zs.push(p.x)
    vs.push(p.y)
  }
  return (z: number): number => {
    if (z <= zs[0]) return vs[0]
    const ultimo = zs.length - 1
    if (z >= zs[ultimo]) return vs[ultimo]
    let bajo = 0
    let alto = ultimo
    while (alto - bajo > 1) {
      const medio = (bajo + alto) >> 1
      if (zs[medio] <= z) bajo = medio
      else alto = medio
    }
    const t = zs[alto] === zs[bajo] ? 0 : (z - zs[bajo]) / (zs[alto] - zs[bajo])
    return vs[bajo] + (vs[alto] - vs[bajo]) * t
  }
}

const anchoBruto = muestreador(PLANTA)
const crestaBruta = muestreador(PERFIL)

/** Media anchura del cuerpo a la altura de la línea de separación. */
export function mitadAncho(z: number): number {
  return Math.max(0.004, anchoBruto(z))
}

/** Altura de la cresta del casco sobre el suelo. */
export function alturaCresta(z: number): number {
  return Math.max(SEPARACION_Y + 0.03, crestaBruta(z))
}

export type OpcionesMalla = {
  /**
   * Zona del cuerpo a generar:
   * - `completo`: casco entero (cresta y ambos flancos).
   * - `derecho` / `izquierdo`: una mitad delantera, cortada por el hueco
   *   central de los botones.
   * - `cuna`: franja central bajo el hueco, para que la ranura no deje ver
   *   el interior.
   */
  sector: 'completo' | 'derecho' | 'izquierdo' | 'cuna'
  zIni: number
  zFin: number
  /** Hundir la superficie hacia abajo (cuna bajo los botones). */
  hundido?: number
  /** Escalas de la sección para generar la pared interior del casco. */
  escalaAncho?: number
  escalaAlto?: number
  /** Margen extra de la cuna a cada lado del hueco. */
  margenCuna?: number
  /** Cierra con un abanico los extremos que coincidan con nariz o cola. */
  tapas?: boolean
  pasosZ?: number
  pasosSeccion?: number
}

/**
 * Tessela la superficie del casco para el sector pedido. Las normales se
 * calculan automáticamente; el bobinado de los triángulos está dispuesto
 * para que apunten hacia fuera.
 */
export function crearMallaCasco(opciones: OpcionesMalla): BufferGeometry {
  const { sector, hundido = 0, escalaAncho = 1, escalaAlto = 1 } = opciones
  const zMin = Math.min(opciones.zIni, opciones.zFin)
  const zMax = Math.max(opciones.zIni, opciones.zFin)
  const pasosZ = opciones.pasosZ ?? (sector === 'cuna' ? 64 : 112)
  const pasosSeccion = opciones.pasosSeccion ?? (sector === 'completo' ? 56 : 24)

  const posiciones: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const longitud = Math.max(1e-6, zMax - zMin)

  for (let i = 0; i <= pasosZ; i++) {
    const z = zMin + (longitud * i) / pasosZ
    const w = mitadAncho(z) * escalaAncho
    const h = SEPARACION_Y + (alturaCresta(z) - SEPARACION_Y) * escalaAlto

    // Rango angular según el sector.
    let t0 = 0
    let t1 = Math.PI
    if (sector === 'derecho' || sector === 'izquierdo') {
      // Borde interior del botón en x = ±hueco/2 sobre la sección.
      const b = Math.min(1, huecoCentral(z) / (2 * Math.max(w, 1e-5)))
      const corte = Math.acos(Math.max(0.001, Math.pow(b, EXPONENTE / 2)))
      if (sector === 'derecho') t1 = corte
      else t0 = Math.PI - corte
    } else if (sector === 'cuna') {
      // La franja central nunca puede ser más ancha que el propio casco en
      // la nariz: si no, asoma por los lados del frente.
      const media = Math.min(
        huecoCentral(z) / 2 + (opciones.margenCuna ?? 0.016),
        w * 0.62,
      ) / Math.max(w, 1e-5)
      const tc = Math.acos(
        Math.max(0.001, Math.min(1, Math.pow(Math.min(1, media), EXPONENTE / 2))),
      )
      t0 = Math.PI / 2 - tc
      t1 = Math.PI / 2 + tc
    }

    for (let j = 0; j <= pasosSeccion; j++) {
      const t = t0 + ((t1 - t0) * j) / pasosSeccion
      const c = Math.cos(t)
      const s = Math.sin(t)
      const x = Math.sign(c) * w * Math.pow(Math.abs(c), 2 / EXPONENTE)
      const y =
        SEPARACION_Y +
        (h - SEPARACION_Y) * Math.pow(Math.max(0, s), 2 / EXPONENTE) -
        hundido
      posiciones.push(x, y, z)
      uvs.push(j / pasosSeccion, i / pasosZ)
    }
  }

  const columnas = pasosSeccion + 1
  for (let i = 0; i < pasosZ; i++) {
    for (let j = 0; j < pasosSeccion; j++) {
      const a = i * columnas + j
      const b = a + 1
      const c = (i + 1) * columnas + j
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  // Tapas en nariz y cola: la superficie colapsa en un extremo diminuto y
  // un abanico lo cierra para que no quede un agujero abierto. El abanico
  // recorre solo el arco superior, así que además hay que cerrar el tramo
  // inferior (el triángulo entre los dos bordes del arco y el ápice): sin él
  // se ve el interior por debajo de la cola, como si faltase plástico.
  const tapas = opciones.tapas ?? false
  if (tapas) {
    if (zMax >= NARIZ_Z - 1e-4) {
      const k = posiciones.length / 3
      const hNariz = SEPARACION_Y + (alturaCresta(zMax) - SEPARACION_Y) * escalaAlto
      posiciones.push(0, (SEPARACION_Y + hNariz) * 0.5, zMax + 0.009)
      uvs.push(0.5, 1)
      const base = pasosZ * columnas
      for (let j = 0; j < pasosSeccion; j++) {
        indices.push(base + j, base + j + 1, k)
      }
      indices.push(base + pasosSeccion, base + 0, k)
    }
    if (zMin <= COLA_Z + 1e-4) {
      const k = posiciones.length / 3
      const hCola = SEPARACION_Y + (alturaCresta(zMin) - SEPARACION_Y) * escalaAlto
      // Remate romo: el ápice sobresale poco más de medio milímetro; con 9 mm
      // la cola quedaba picuda y sus facetas se veían como plástico ausente.
      posiciones.push(0, (SEPARACION_Y + hCola) * 0.5, zMin - 0.004)
      uvs.push(0.5, 0)
      for (let j = 0; j < pasosSeccion; j++) {
        indices.push(j + 1, j, k)
      }
      indices.push(0, pasosSeccion, k)
    }
  }

  const geometria = new BufferGeometry()
  geometria.setAttribute('position', new Float32BufferAttribute(posiciones, 3))
  geometria.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometria.setIndex(indices)
  geometria.computeVertexNormals()
  return geometria
}

/** Puntos del contorno cerrado de la planta (en el plano x,z). */
export function contornoPlanta(escala: number, recorte = 0): Vector2[] {
  const puntos: Vector2[] = []
  const pasos = 132
  const wDe = (z: number) => Math.max(0.004, anchoBruto(z) - recorte) * escala
  for (let i = 0; i <= pasos; i++) {
    const z = NARIZ_Z - ((NARIZ_Z - COLA_Z) * i) / pasos
    puntos.push(new Vector2(wDe(z), z))
  }
  for (let i = pasos; i >= 0; i--) {
    const z = NARIZ_Z - ((NARIZ_Z - COLA_Z) * i) / pasos
    puntos.push(new Vector2(-wDe(z), z))
  }
  return puntos
}

/** Misma planta como `Shape` de three (x = lateral, y = z). */
export function formaContorno(escala: number, recorte = 0): Shape {
  const forma = new Shape()
  const puntos = contornoPlanta(escala, recorte)
  forma.moveTo(puntos[0].x, puntos[0].y)
  for (let i = 1; i < puntos.length; i++) forma.lineTo(puntos[i].x, puntos[i].y)
  forma.closePath()
  return forma
}

/** Planta con un agujero interior: anillo de anchura aproximadamente
 * constante que sigue el contorno (para la tira de luz perimetral). */
export function formaAnular(escala: number): Shape {
  const forma = formaContorno(escala)
  const puntos = contornoPlanta(escala, 0.012)
  // El agujero se recorre en sentido inverso al contorno exterior.
  const agujero = new Path()
  agujero.moveTo(puntos[puntos.length - 1].x, puntos[puntos.length - 1].y)
  for (let i = puntos.length - 2; i >= 0; i--) {
    agujero.lineTo(puntos[i].x, puntos[i].y)
  }
  agujero.closePath()
  forma.holes.push(agujero)
  return forma
}

/**
 * Rueda de scroll: superficie de revolución con estrías suaves y hombros
 * redondeados, con el eje a lo largo de X. El perfil se cierra por la cara
 * interior para que la llanta sea un sólido.
 */
export function crearLlantaRueda(
  radio = RUEDA_RADIO,
  ancho = 0.021,
  estrias = 34,
  segmentos = 200,
): BufferGeometry {
  // Perfil (x a lo largo del eje, desplazamiento radial).
  const perfil: Array<[number, number, number]> = [
    [-ancho / 2, -0.0068, 0.2],
    [-ancho / 2 + 0.0022, -0.0016, 0.8],
    [-ancho / 2 + 0.005, 0.0, 1],
    [ancho / 2 - 0.005, 0.0, 1],
    [ancho / 2 - 0.0022, -0.0016, 0.8],
    [ancho / 2, -0.0068, 0.2],
  ]
  const filas = perfil.length
  const posiciones: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const muesca = (angulo: number) =>
    -0.0026 * Math.pow(0.5 + 0.5 * Math.cos(estrias * angulo), 1.7)

  for (let i = 0; i <= segmentos; i++) {
    const ang = (i / segmentos) * Math.PI * 2
    const corte = muesca(ang)
    for (let k = 0; k < filas; k++) {
      const [dx, dr, amplitud] = perfil[k]
      const r = radio + dr + corte * amplitud
      posiciones.push(dx, r * Math.cos(ang), r * Math.sin(ang))
      uvs.push(i / segmentos, k / filas)
    }
  }

  for (let i = 0; i < segmentos; i++) {
    for (let k = 0; k < filas; k++) {
      const siguiente = (k + 1) % filas
      const a = i * filas + k
      const b = i * filas + siguiente
      const c = (i + 1) * filas + k
      const d = (i + 1) * filas + siguiente
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometria = new BufferGeometry()
  geometria.setAttribute('position', new Float32BufferAttribute(posiciones, 3))
  geometria.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometria.setIndex(indices)
  geometria.computeVertexNormals()
  return geometria
}
