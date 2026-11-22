import { useEffect, useRef } from 'react'
import { sim } from '../estado/sim'
import { hexAcento, useUsoTienda } from '../estado/usoTienda'
import { onda } from '../escena/sobrecarga'
import {
  CompositorFoto,
  cargarFotograma,
  facilEntradaSalida,
  masCercano,
  ordenarUrls,
  type Fotograma,
} from './fotoCompuesta'

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
const URLS_BASE = ordenarUrls(BASE)
const URLS_LUZ = ordenarUrls(LUZ)
const TOTAL = URLS_BASE.length

/** Píxeles de arrastre por fotograma (5° por fotograma). */
const PX_POR_FOTOGRAMA = 7
/** Segundos por fotograma en la rotación automática (vuelta en ~11 s). */
const PASO_AUTO = 0.15

export function GiroFoto() {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = lienzo.current
    const contenedor = caja.current
    if (!canvas || !contenedor || TOTAL === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const compositor = new CompositorFoto(ctx)

    let sucio = true
    const medir = () => {
      const r = contenedor.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      compositor.dimensionar(
        Math.max(1, Math.round(r.width * dpr)),
        Math.max(1, Math.round(r.height * dpr)),
      )
      sucio = true
    }

    const fotogramas: Fotograma[] = new Array(TOTAL)
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
        fotogramas[i] = cargarFotograma(URLS_BASE[i], URLS_LUZ[i], alCargar)
      }
      if (siguiente >= TOTAL) window.clearInterval(temporizador)
    }, 50)

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
      const f = masCercano(fotogramas, Math.round(posicion), true)
      if (!f) return
      compositor.pintar(f.base, f.luz, colorAntes, colorAhora, barrido)
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
