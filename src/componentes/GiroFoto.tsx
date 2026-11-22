import { useEffect, useRef } from 'react'
import { sim } from '../estado/sim'
import { hexAcento, useUsoTienda } from '../estado/usoTienda'
import { onda } from '../escena/sobrecarga'

/**
 * Giro de 360° fotorrealista del héroe: 72 fotogramas renderizados en Cycles
 * (`modelado/giro.py`) en dos pasadas que se suman aquí, en un <canvas>:
 *
 *   imagen = base + luz × acento
 *
 * `base` es el ratón con la luz de estudio y la tira apagada; `luz`, solo la
 * luz de la tira en blanco (la tira, el logo y lo que alumbran). Así el
 * color se elige en la web y se puede animar sin renderizar una tanda por
 * color. Se arrastra para girar, rota solo en reposo y al cambiar de color da
 * una vuelta mientras un barrido cambia el tono, como la sobrecarga del 3D.
 */
const BASE = import.meta.glob<string>('../assets/giro/base/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
})
const LUZ = import.meta.glob<string>('../assets/giro/luz/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
})
const ordenar = (urls: Record<string, string>) =>
  Object.keys(urls)
    .sort()
    .map((k) => urls[k])
const URLS_BASE = ordenar(BASE)
const URLS_LUZ = ordenar(LUZ)
const TOTAL = URLS_BASE.length

/** Píxeles de arrastre por fotograma (5° por fotograma). */
const PX_POR_FOTOGRAMA = 7
/** Segundos por fotograma en la rotación automática (vuelta en ~11 s). */
const PASO_AUTO = 0.15

type Fotograma = { base: HTMLImageElement; luz: HTMLImageElement; listo: boolean }

function cargar(i: number, alCargar: () => void): Fotograma {
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
  base.src = URLS_BASE[i]
  luz.src = URLS_LUZ[i]
  return f
}

const facilEntradaSalida = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export function GiroFoto() {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = lienzo.current
    const contenedor = caja.current
    if (!canvas || !contenedor || TOTAL === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Lienzos auxiliares para teñir la luz (multiplicar por el color).
    const tinteA = document.createElement('canvas')
    const tinteB = document.createElement('canvas')
    const ctxA = tinteA.getContext('2d')!
    const ctxB = tinteB.getContext('2d')!

    let ancho = 0
    let alto = 0
    const medir = () => {
      const r = contenedor.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      ancho = Math.max(1, Math.round(r.width * dpr))
      alto = Math.max(1, Math.round(r.height * dpr))
      for (const c of [canvas, tinteA, tinteB]) {
        c.width = ancho
        c.height = alto
      }
      sucio = true
    }

    let sucio = true
    const fotogramas: Fotograma[] = []
    const alCargar = () => {
      sucio = true
    }
    // Primero el fotograma inicial (el que se ve) y luego sus vecinos
    // alternando a cada lado, para que el arrastre los encuentre cuanto antes.
    const orden = [0]
    for (let d = 1; orden.length < TOTAL; d++) {
      orden.push(d % TOTAL)
      if (orden.length < TOTAL) orden.push((TOTAL - d) % TOTAL)
    }
    let siguiente = 0
    const temporizador = window.setInterval(() => {
      for (let n = 0; n < 6 && siguiente < TOTAL; n++, siguiente++) {
        const i = orden[siguiente]
        fotogramas[i] = cargar(i, alCargar)
      }
      if (siguiente >= TOTAL) window.clearInterval(temporizador)
    }, 50)

    // Fotograma listo más cercano al pedido (mientras se descargan).
    const elegir = (i: number): Fotograma | null => {
      for (let d = 0; d < TOTAL; d++) {
        for (const j of [i + d, i - d]) {
          const f = fotogramas[((j % TOTAL) + TOTAL) % TOTAL]
          if (f?.listo) return f
        }
      }
      return null
    }

    const teñir = (c: CanvasRenderingContext2D, luz: HTMLImageElement, color: string) => {
      c.globalCompositeOperation = 'source-over'
      c.drawImage(luz, 0, 0, ancho, alto)
      c.globalCompositeOperation = 'multiply'
      c.fillStyle = color
      c.fillRect(0, 0, ancho, alto)
    }

    const pintar = (f: Fotograma, colorAntes: string, colorAhora: string, barrido: number) => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(f.base, 0, 0, ancho, alto)
      teñir(ctxB, f.luz, colorAhora)
      if (barrido >= 1) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.drawImage(tinteB, 0, 0)
        return
      }
      // Barrido de izquierda a derecha: el color nuevo entra por un frente
      // suave con una cresta blanca, como la sobrecarga del 3D.
      teñir(ctxA, f.luz, colorAntes)
      const frente = -0.15 + barrido * 1.3
      const mascara = (c: CanvasRenderingContext2D, nuevo: boolean) => {
        const g = c.createLinearGradient(0, 0, ancho, 0)
        const a = Math.max(0, Math.min(1, frente - 0.08))
        const b = Math.max(0, Math.min(1, frente + 0.08))
        g.addColorStop(0, nuevo ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)')
        g.addColorStop(a, nuevo ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)')
        g.addColorStop(b, nuevo ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)')
        g.addColorStop(1, nuevo ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)')
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
      ctxA.drawImage(f.luz, 0, 0, ancho, alto)
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

    // Estado del giro.
    let posicion = 0 // en fotogramas (continuo)
    let arrastrando = false
    let xInicio = 0
    let posInicio = 0
    let ultimoMovimiento = 0
    let colorAntes = hexAcento(useUsoTienda.getState().acento)
    let colorAhora = colorAntes
    let girandoColor = false
    let posGiro = 0

    const quitarAcento = useUsoTienda.subscribe((s) => {
      const nuevo = hexAcento(s.acento)
      if (nuevo === colorAhora) return
      colorAntes = colorAhora
      colorAhora = nuevo
      girandoColor = !useUsoTienda.getState().reducido
      posGiro = posicion
      sucio = true
    })

    const alPulsar = (e: PointerEvent) => {
      arrastrando = true
      xInicio = e.clientX
      posInicio = posicion
      canvas.setPointerCapture(e.pointerId)
    }
    const alMover = (e: PointerEvent) => {
      if (!arrastrando) return
      posicion = posInicio - (e.clientX - xInicio) / PX_POR_FOTOGRAMA
      ultimoMovimiento = performance.now()
      sucio = true
    }
    const alSoltar = (e: PointerEvent) => {
      arrastrando = false
      ultimoMovimiento = performance.now()
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') posicion += 2
      else if (e.key === 'ArrowRight') posicion -= 2
      else return
      e.preventDefault()
      ultimoMovimiento = performance.now()
      sucio = true
    }
    canvas.addEventListener('pointerdown', alPulsar)
    canvas.addEventListener('pointermove', alMover)
    canvas.addEventListener('pointerup', alSoltar)
    canvas.addEventListener('pointercancel', alSoltar)
    canvas.addEventListener('keydown', alTecla)

    // Solo trabaja mientras se ve; el 3D en vivo se oculta mientras tanto.
    let visible = true
    const observador = new IntersectionObserver(
      ([entrada]) => {
        visible = entrada.isIntersecting
        sim.fotoHeroe = entrada.intersectionRatio > 0.12
      },
      { threshold: [0, 0.12, 0.3] },
    )
    observador.observe(contenedor)
    const alRedimensionar = new ResizeObserver(medir)
    alRedimensionar.observe(contenedor)
    medir()

    let raf = 0
    let previo = performance.now()
    const bucle = (ahora: number) => {
      raf = requestAnimationFrame(bucle)
      const delta = Math.min(0.1, (ahora - previo) / 1000)
      previo = ahora
      if (!visible) return
      const reducido = useUsoTienda.getState().reducido
      const ocioso = !arrastrando && ahora - ultimoMovimiento > 2500

      let barrido = 1
      if (girandoColor) {
        // Mismo reloj que la sobrecarga del 3D (`Onda`).
        const p = onda.activo.value > 0 ? onda.progreso.value : 1
        barrido = p
        posicion = posGiro + facilEntradaSalida(p) * TOTAL
        sucio = true
        if (p >= 1) {
          girandoColor = false
          colorAntes = colorAhora
        }
      } else if (ocioso && !reducido) {
        posicion += delta / PASO_AUTO
        sucio = true
      }
      if (!sucio) return
      const f = elegir(Math.round(posicion))
      if (!f) return
      pintar(f, colorAntes, colorAhora, barrido)
      sucio = false
    }
    raf = requestAnimationFrame(bucle)

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(temporizador)
      observador.disconnect()
      alRedimensionar.disconnect()
      quitarAcento()
      canvas.removeEventListener('pointerdown', alPulsar)
      canvas.removeEventListener('pointermove', alMover)
      canvas.removeEventListener('pointerup', alSoltar)
      canvas.removeEventListener('pointercancel', alSoltar)
      canvas.removeEventListener('keydown', alTecla)
      sim.fotoHeroe = false
    }
  }, [])

  return (
    <div ref={caja} className="giro-foto">
      <canvas
        ref={lienzo}
        className="giro-foto__lienzo"
        role="img"
        tabIndex={0}
        aria-label="VOLTA X1 fotografiado sobre una alfombrilla negra con la tira de luz encendida. Arrastra o usa las flechas para girarlo."
      />
    </div>
  )
}
