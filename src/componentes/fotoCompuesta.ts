/**
 * Composición de las fotos de Cycles renderizadas en dos pasadas
 * (`modelado/giro.py`, `modelado/despiece.py`):
 *
 *   imagen = base + luz × acento
 *
 * `base` es el ratón con la luz de estudio y los LED apagados (puede traer
 * canal alfa); `luz`, solo la luz de los LED en blanco. Así el color se elige
 * en la web y se puede animar sin renderizar una tanda por color. Durante un
 * cambio de acento, un barrido de izquierda a derecha con una cresta blanca
 * lleva el color nuevo, como la sobrecarga del 3D.
 */
export class CompositorFoto {
  private readonly ctx: CanvasRenderingContext2D
  private readonly tinteA = document.createElement('canvas')
  private readonly tinteB = document.createElement('canvas')
  private readonly ctxA: CanvasRenderingContext2D
  private readonly ctxB: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
    this.ctxA = this.tinteA.getContext('2d')!
    this.ctxB = this.tinteB.getContext('2d')!
  }

  /** Ajusta los lienzos auxiliares al tamaño (en píxeles) del lienzo final. */
  dimensionar(ancho: number, alto: number) {
    for (const c of [this.ctx.canvas, this.tinteA, this.tinteB]) {
      c.width = ancho
      c.height = alto
    }
  }

  private teñir(c: CanvasRenderingContext2D, luz: CanvasImageSource, color: string) {
    const { width, height } = c.canvas
    c.globalCompositeOperation = 'source-over'
    c.clearRect(0, 0, width, height)
    c.drawImage(luz, 0, 0, width, height)
    c.globalCompositeOperation = 'multiply'
    c.fillStyle = color
    c.fillRect(0, 0, width, height)
  }

  /** Pinta una foto. `barrido` 0..1 = avance del color nuevo (1 = terminado). */
  pintar(
    base: CanvasImageSource,
    luz: CanvasImageSource,
    colorAntes: string,
    colorAhora: string,
    barrido = 1,
  ) {
    const { ctx, ctxA, ctxB, tinteA, tinteB } = this
    const { width: ancho, height: alto } = ctx.canvas
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, ancho, alto)
    ctx.drawImage(base, 0, 0, ancho, alto)
    this.teñir(ctxB, luz, colorAhora)
    if (barrido >= 1) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(tinteB, 0, 0)
      return
    }
    this.teñir(ctxA, luz, colorAntes)
    const frente = -0.15 + barrido * 1.3
    const mascara = (c: CanvasRenderingContext2D, nuevo: boolean) => {
      const g = c.createLinearGradient(0, 0, ancho, 0)
      const a = Math.max(0, Math.min(1, frente - 0.08))
      const b = Math.max(0, Math.min(1, frente + 0.08))
      const lleno = 'rgba(0,0,0,1)'
      const vacio = 'rgba(0,0,0,0)'
      g.addColorStop(0, nuevo ? lleno : vacio)
      g.addColorStop(a, nuevo ? lleno : vacio)
      g.addColorStop(b, nuevo ? vacio : lleno)
      g.addColorStop(1, nuevo ? vacio : lleno)
      c.globalCompositeOperation = 'destination-in'
      c.fillStyle = g
      c.fillRect(0, 0, ancho, alto)
    }
    mascara(ctxA, false)
    mascara(ctxB, true)
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(tinteA, 0, 0)
    ctx.drawImage(tinteB, 0, 0)
    // Cresta: la luz en blanco en una franja estrecha sobre el frente.
    ctxA.globalCompositeOperation = 'source-over'
    ctxA.clearRect(0, 0, ancho, alto)
    ctxA.drawImage(luz, 0, 0, ancho, alto)
    const g = ctxA.createLinearGradient(0, 0, ancho, 0)
    const centro = Math.max(0, Math.min(1, frente))
    g.addColorStop(Math.max(0, centro - 0.05), 'rgba(0,0,0,0)')
    g.addColorStop(centro, 'rgba(0,0,0,0.9)')
    g.addColorStop(Math.min(1, centro + 0.05), 'rgba(0,0,0,0)')
    ctxA.globalCompositeOperation = 'destination-in'
    ctxA.fillStyle = g
    ctxA.fillRect(0, 0, ancho, alto)
    ctx.drawImage(tinteA, 0, 0)
  }
}

export type Fotograma = { base: HTMLImageElement; luz: HTMLImageElement; listo: boolean }

/** Carga las dos pasadas de un fotograma; `listo` cuando llegan ambas. */
export function cargarFotograma(urlBase: string, urlLuz: string, alCargar: () => void): Fotograma {
  const base = new Image()
  const luz = new Image()
  const f: Fotograma = { base, luz, listo: false }
  let pendientes = 2
  const uno = () => {
    pendientes -= 1
    if (pendientes === 0) {
      f.listo = true
      alCargar()
    }
  }
  base.decoding = 'async'
  luz.decoding = 'async'
  base.onload = uno
  luz.onload = uno
  base.src = urlBase
  luz.src = urlLuz
  return f
}

/** Ordena unas URL de `import.meta.glob` por nombre de fichero. */
export function ordenarUrls(urls: Record<string, string>): string[] {
  return Object.keys(urls)
    .sort()
    .map((k) => urls[k])
}

/** Fotograma listo más cercano al pedido (mientras se descargan los demás). */
export function masCercano(fotogramas: (Fotograma | undefined)[], i: number, ciclico: boolean) {
  const total = fotogramas.length
  for (let d = 0; d < total; d++) {
    for (const j of [i + d, i - d]) {
      const k = ciclico ? ((j % total) + total) % total : j
      if (k < 0 || k >= total) continue
      const f = fotogramas[k]
      if (f?.listo) return f
    }
  }
  return null
}

export const facilEntradaSalida = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
