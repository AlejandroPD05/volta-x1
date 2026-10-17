import { CanvasTexture, RepeatWrapping, type Texture } from 'three'

/**
 * Acabados procedurales de superficie.
 *
 * Un plástico soft-touch real no es un color plano con brillo uniforme: tiene
 * relieve microscópico (grano), satinado irregular por el roce y el aceite de
 * la piel, y marcas de mecanizado en las piezas que trabajan. Estas funciones
 * generan esos mapas en lienzo (nada de archivos externos) y son deterministas
 * (semilla fija): el mismo acabado en cada carga y en cada build.
 */

/** Generador pseudoaleatorio con semilla (mulberry32). */
function crearAleatorio(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Rejilla `lado × lado` de valores 0..1 (la envoltura la resuelve el muestreo). */
function rejillaRuido(lado: number, aleatorio: () => number): Float32Array {
  const valores = new Float32Array(lado * lado)
  for (let i = 0; i < valores.length; i++) valores[i] = aleatorio()
  return valores
}

/** Muestreo bilineal con suavizado (smoothstep) de una rejilla que envuelve. */
function muestrear(valores: Float32Array, lado: number, x: number, y: number): number {
  const fx = x * lado
  const fy = y * lado
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = fx - x0
  const ty = fy - y0
  const sx = tx * tx * (3 - 2 * tx)
  const sy = ty * ty * (3 - 2 * ty)
  const at = (ix: number, iy: number) =>
    valores[((((iy % lado) + lado) % lado) * lado) + (((ix % lado) + lado) % lado)]
  const a = at(x0, y0)
  const b = at(x0 + 1, y0)
  const c = at(x0, y0 + 1)
  const d = at(x0 + 1, y0 + 1)
  const arriba = a + (b - a) * sx
  const abajo = c + (d - c) * sx
  return arriba + (abajo - arriba) * sy
}

/**
 * Convierte un campo de altura (0..1) en un mapa normal tangente con un
 * filtro de Sobel: así el relieve responde de verdad a la luz rasante, que es
 * lo que delata a un plástico "de videojuego".
 */
function aMapaNormal(
  altura: Float32Array,
  tamano: number,
  repeticion: number | [number, number],
  fuerza: number,
): Texture {
  const datos = new Uint8ClampedArray(tamano * tamano * 4)
  const at = (x: number, y: number) =>
    altura[((((y % tamano) + tamano) % tamano) * tamano) + (((x % tamano) + tamano) % tamano)]

  for (let y = 0; y < tamano; y++) {
    for (let x = 0; x < tamano; x++) {
      const gx =
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) -
        at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
      const gy =
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) -
        at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
      const nx = gx * fuerza
      const ny = gy * fuerza
      const norma = Math.sqrt(nx * nx + ny * ny + 1)
      const i = (y * tamano + x) * 4
      datos[i] = 128 - (nx / norma) * 127
      datos[i + 1] = 128 + (ny / norma) * 127
      datos[i + 2] = 128 + (1 / norma) * 127
      datos[i + 3] = 255
    }
  }

  const lienzo = document.createElement('canvas')
  lienzo.width = tamano
  lienzo.height = tamano
  const ctx = lienzo.getContext('2d')
  if (ctx) {
    const imagen = ctx.createImageData(tamano, tamano)
    imagen.data.set(datos)
    ctx.putImageData(imagen, 0, 0)
  }

  const textura = new CanvasTexture(lienzo)
  textura.wrapS = RepeatWrapping
  textura.wrapT = RepeatWrapping
  if (Array.isArray(repeticion)) textura.repeat.set(repeticion[0], repeticion[1])
  else textura.repeat.set(repeticion, repeticion)
  textura.anisotropy = 4
  return textura
}

export type OpcionesGrano = {
  tamano?: number
  repeticion?: number | [number, number]
  /** Inclinación del relieve: cuánto atrapa la luz. */
  fuerza?: number
  /** Octavas de ruido: la primera son manchas amplias, las siguientes grano. */
  octavas?: number
  /** Peso de la octava amplia (la ondulación suave de la pieza moldeada). */
  manchas?: number
  semilla?: number
}

/**
 * Mapa normal de grano soft-touch: varias octavas de ruido de valor (manchas
 * del molde + micro-grano) convertidas a normales. Sustituye con ventaja al
 * bumpMap de puntos: el relieve aguanta la luz rasante como una superficie
 * real y no se queda "plano" de cerca.
 */
export function crearMapaNormal({
  tamano = 256,
  repeticion = 14,
  fuerza = 2.6,
  octavas = 3,
  manchas = 0.9,
  semilla = 7,
}: OpcionesGrano = {}): Texture {
  const aleatorio = crearAleatorio(semilla)
  const altura = new Float32Array(tamano * tamano)
  let pesoTotal = 0
  let lado = 16
  for (let o = 0; o < octavas; o++) {
    const peso = o === 0 ? manchas : o === 1 ? 0.55 : 0.3
    const valores = rejillaRuido(lado, aleatorio)
    for (let y = 0; y < tamano; y++) {
      for (let x = 0; x < tamano; x++) {
        altura[y * tamano + x] += peso * muestrear(valores, lado, x / tamano, y / tamano)
      }
    }
    pesoTotal += peso
    lado *= 3
  }
  for (let i = 0; i < altura.length; i++) altura[i] /= pesoTotal
  return aMapaNormal(altura, tamano, repeticion, fuerza)
}

export type OpcionesSatinado = {
  tamano?: number
  semilla?: number
  /** Manchas del roce de la mano (el aceite de la piel pule el plástico). */
  manchas?: number
  /** Cuánto oscurece el centro de cada mancha. */
  contraste?: number
  /** Vetas verticales del satinado (corren a lo largo del ratón). */
  vetas?: number
  /** Densidad del moteado fino del plástico (0 = superficie limpia). */
  moteado?: number
}

/**
 * Mapa de rugosidad "satinado" para plásticos: gris neutro (la rugosidad base
 * del material) con manchas amplias algo más lisas donde apoyan la palma y
 * los dedos, vetas de roce a lo largo del cuerpo y un moteado fino. Oscuro =
 * más liso en un mapa de rugosidad, así que las manchas del roce brillan un
 * poco más, como en un ratón usado con cariño.
 */
export function crearTexturaRugosidad({
  tamano = 256,
  semilla = 11,
  manchas = 24,
  contraste = 0.16,
  vetas = 80,
  moteado = 0.025,
}: OpcionesSatinado = {}): Texture {
  const aleatorio = crearAleatorio(semilla)
  const lienzo = document.createElement('canvas')
  lienzo.width = tamano
  lienzo.height = tamano
  const ctx = lienzo.getContext('2d')

  if (ctx) {
    ctx.fillStyle = '#c9c9c9'
    ctx.fillRect(0, 0, tamano, tamano)

    // Vetas verticales (a lo largo del ratón): el roce deja el satinado a
    // bandas, no en manchas redondas.
    for (let i = 0; i < vetas; i++) {
      const x = aleatorio() * tamano
      const ancho = 3 + aleatorio() * 20
      const oscuro = aleatorio() < 0.6
      const alfa = 0.02 + aleatorio() * 0.045
      ctx.fillStyle = oscuro ? `rgba(0, 0, 0, ${alfa})` : `rgba(255, 255, 255, ${alfa})`
      ctx.fillRect(x - ancho / 2, 0, ancho, tamano)
    }

    // Manchas del roce: gradientes radiales oscuros y muy suaves.
    for (let i = 0; i < manchas; i++) {
      const x = aleatorio() * tamano
      const y = aleatorio() * tamano
      const radio = 16 + aleatorio() * 54
      const gradiente = ctx.createRadialGradient(x, y, 0, x, y, radio)
      gradiente.addColorStop(0, `rgba(22, 22, 22, ${(0.5 + aleatorio() * 0.5) * contraste})`)
      gradiente.addColorStop(1, 'rgba(22, 22, 22, 0)')
      ctx.fillStyle = gradiente
      ctx.fillRect(x - radio, y - radio, radio * 2, radio * 2)
    }

    // Moteado fino: la micro-irregularidad del propio plástico.
    const puntos = Math.round(tamano * tamano * moteado)
    for (let i = 0; i < puntos; i++) {
      const x = aleatorio() * tamano
      const y = aleatorio() * tamano
      const valor = aleatorio() < 0.5 ? 0 : 255
      ctx.fillStyle = `rgba(${valor}, ${valor}, ${valor}, ${0.03 + aleatorio() * 0.05})`
      ctx.fillRect(x, y, 1 + aleatorio() * 1.5, 1 + aleatorio() * 1.5)
    }
  }

  const textura = new CanvasTexture(lienzo)
  textura.wrapS = RepeatWrapping
  textura.wrapT = RepeatWrapping
  textura.anisotropy = 4
  return textura
}

export type TexturasRayado = {
  /** Rugosidad: las estrías fresadas cambian el brillo del patín. */
  rugosidad: Texture
  /** Normales: el relieve de las marcas y la rodadura. */
  normal: Texture
}

/**
 * Patines de PTFE: superficie fresada con micro-estrías longitudinales y
 * alguna marca de rodadura. Se dibuja el mismo trazado dos veces (altura para
 * las normales, brillo para la rugosidad) para que relieve y acabado cuenten
 * exactamente la misma historia.
 */
export function crearTexturasRayado({
  tamano = 256,
  repeticion = 2,
  semilla = 23,
}: {
  tamano?: number
  repeticion?: number
  semilla?: number
} = {}): TexturasRayado {
  const aleatorio = crearAleatorio(semilla)
  const lienzoAltura = document.createElement('canvas')
  const lienzoBrillo = document.createElement('canvas')
  for (const lienzo of [lienzoAltura, lienzoBrillo]) {
    lienzo.width = tamano
    lienzo.height = tamano
  }
  const ctxAltura = lienzoAltura.getContext('2d')
  const ctxBrillo = lienzoBrillo.getContext('2d')

  if (ctxAltura && ctxBrillo) {
    ctxAltura.fillStyle = '#808080'
    ctxAltura.fillRect(0, 0, tamano, tamano)
    ctxBrillo.fillStyle = '#c8c8c8'
    ctxBrillo.fillRect(0, 0, tamano, tamano)

    const estrías = 150
    for (let i = 0; i < estrías; i++) {
      const y = aleatorio() * tamano
      const largo = tamano * (0.15 + aleatorio() * 0.85)
      const x = aleatorio() * tamano - largo / 2
      const grosor = 0.5 + aleatorio() * 0.9
      const alfa = 0.05 + aleatorio() * 0.09
      const claro = aleatorio() < 0.5
      ctxAltura.fillStyle = claro ? `rgba(255, 255, 255, ${alfa})` : `rgba(0, 0, 0, ${alfa})`
      ctxAltura.fillRect(x, y, largo, grosor)
      // En el brillo, las estrías fresadas son algo más mates que el resto.
      ctxBrillo.fillStyle = `rgba(0, 0, 0, ${alfa * 0.8})`
      ctxBrillo.fillRect(x, y, largo, grosor)
    }

    // Unas pocas marcas de rodadura más largas y profundas.
    for (let i = 0; i < 7; i++) {
      const y = aleatorio() * tamano
      ctxAltura.fillStyle = `rgba(0, 0, 0, ${0.1 + aleatorio() * 0.08})`
      ctxAltura.fillRect(0, y, tamano, 0.8 + aleatorio() * 0.8)
      ctxBrillo.fillStyle = `rgba(0, 0, 0, ${0.08 + aleatorio() * 0.06})`
      ctxBrillo.fillRect(0, y, tamano, 1.2)
    }
  }

  // Lectura del lienzo de altura para el mapa de normales.
  const altura = new Float32Array(tamano * tamano)
  if (ctxAltura) {
    const imagen = ctxAltura.getImageData(0, 0, tamano, tamano)
    for (let i = 0; i < altura.length; i++) altura[i] = imagen.data[i * 4] / 255
  }

  const rugosidad = new CanvasTexture(lienzoBrillo)
  rugosidad.wrapS = RepeatWrapping
  rugosidad.wrapT = RepeatWrapping
  rugosidad.repeat.set(repeticion, repeticion)
  rugosidad.anisotropy = 4
  return { rugosidad, normal: aMapaNormal(altura, tamano, repeticion, 2) }
}

/**
 * Tejido de fibra de vidrio del FR4: hilos en las dos direcciones que se
 * cruzan en celdas alternas (tejido plano). A la escala de la placa queda como
 * un satinado finísimo que rompe los reflejos de la mascarilla, como una PCB
 * de verdad vista de cerca.
 */
export function crearMapaNormalTejido({
  tamano = 128,
  repeticion = 26,
  fuerza = 2.2,
}: {
  tamano?: number
  repeticion?: number
  fuerza?: number
} = {}): Texture {
  const celda = 16
  const altura = new Float32Array(tamano * tamano)
  for (let y = 0; y < tamano; y++) {
    for (let x = 0; x < tamano; x++) {
      const localX = ((x % celda) + 0.5) / celda
      const localY = ((y % celda) + 0.5) / celda
      const cruzada = (Math.floor(x / celda) + Math.floor(y / celda)) % 2 === 0
      altura[y * tamano + x] = cruzada
        ? Math.sin(Math.PI * localX)
        : Math.sin(Math.PI * localY)
    }
  }
  return aMapaNormal(altura, tamano, repeticion, fuerza)
}

/**
 * Textura de grano suave para el bumpMap de los plásticos grandes: el acabado
 * soft-touch de un ratón real tiene una microtextura que atrapa la luz de
 * manera irregular. Se dibuja con puntos difusos aleatorios sobre gris
 * neutro para que el bump no introduzca desplazamiento medio.
 */
export function crearTexturaGrano(tamano = 256, repeticion = 7, fuerza = 0.4): Texture {
  const lienzo = document.createElement('canvas')
  lienzo.width = tamano
  lienzo.height = tamano
  const ctx = lienzo.getContext('2d')

  if (ctx) {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, tamano, tamano)

    const gotas = tamano * 26
    for (let i = 0; i < gotas; i++) {
      const x = Math.random() * tamano
      const y = Math.random() * tamano
      const radio = 0.5 + Math.random() * 1.5
      const valor = Math.round(128 + (Math.random() - 0.5) * 255 * fuerza)
      ctx.fillStyle = `rgba(${valor}, ${valor}, ${valor}, 0.5)`
      ctx.beginPath()
      ctx.arc(x, y, radio, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const textura = new CanvasTexture(lienzo)
  textura.wrapS = RepeatWrapping
  textura.wrapT = RepeatWrapping
  textura.repeat.set(repeticion, repeticion)
  return textura
}
