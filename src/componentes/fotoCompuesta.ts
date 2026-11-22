/**
 * Composición de las fotos de Cycles renderizadas en dos pasadas
 * (`modelado/giro.py`, `modelado/despiece.py`):
 *
 *   imagen = base + luz × onda RGB
 *
 * `base` es el ratón con la luz de estudio y los LED apagados (con canal
 * alfa); `luz`, solo la luz de los LED en blanco. Aquí la luz se tiñe con un
 * arcoíris que recorre la imagen de izquierda a derecha (la onda RGB de los
 * ratones gaming) y se suma a la base. `fase` (0..1) desplaza la onda: el
 * que llama la avanza con el tiempo, o la deja quieta con movimiento reducido.
 */

/** Vueltas de color que caben a lo ancho del fotograma. */
const VUELTAS = 1.15
/** Paradas del degradado por vuelta (cada 60° de tono). */
const PARADAS = 6

export class CompositorFoto {
  private readonly ctx: CanvasRenderingContext2D
  private readonly tinte = document.createElement('canvas')
  private readonly ctxTinte: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
    this.ctxTinte = this.tinte.getContext('2d')!
  }

  /** Ajusta el lienzo auxiliar al tamaño (en píxeles) del lienzo final. */
  dimensionar(ancho: number, alto: number) {
    for (const c of [this.ctx.canvas, this.tinte]) {
      c.width = ancho
      c.height = alto
    }
  }

  /** Pinta una foto con la onda RGB en la posición `fase` (0..1, cíclica). */
  pintar(base: CanvasImageSource, luz: CanvasImageSource, fase: number) {
    const { ctx, ctxTinte, tinte } = this
    const { width: ancho, height: alto } = ctx.canvas
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, ancho, alto)
    ctx.drawImage(base, 0, 0, ancho, alto)

    // La luz en blanco, multiplicada por el arcoíris.
    ctxTinte.globalCompositeOperation = 'source-over'
    ctxTinte.clearRect(0, 0, ancho, alto)
    ctxTinte.drawImage(luz, 0, 0, ancho, alto)
    const g = ctxTinte.createLinearGradient(0, 0, ancho, 0)
    const total = Math.ceil(VUELTAS * PARADAS) + 1
    for (let i = 0; i <= total; i++) {
      const t = i / total
      const tono = (t * VUELTAS - fase) * 360
      g.addColorStop(t, `hsl(${((tono % 360) + 360) % 360} 100% 55%)`)
    }
    ctxTinte.globalCompositeOperation = 'multiply'
    ctxTinte.fillStyle = g
    ctxTinte.fillRect(0, 0, ancho, alto)

    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(tinte, 0, 0)
  }
}

/** Segundos que tarda la onda RGB en dar una vuelta completa. */
export const PERIODO_ONDA = 6

/** Fase de la onda para un instante (en ms), o quieta con movimiento reducido. */
export function faseOnda(ahora: number, reducido: boolean): number {
  return reducido ? 0 : (ahora / 1000 / PERIODO_ONDA) % 1
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

