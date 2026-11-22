import { useEffect, useRef } from 'react'
import datosHotspots from '../assets/despiece/hotspots.json'
import { marcadores, ranuraMarcador, sim } from '../estado/sim'
import { hexAcento, useUsoTienda } from '../estado/usoTienda'
import { onda } from '../escena/sobrecarga'
import { CompositorFoto, cargarFotograma, masCercano, ordenarUrls, type Fotograma } from './fotoCompuesta'

/**
 * Despiece fotorrealista: la explosión del ratón renderizada en Cycles
 * (`modelado/despiece.py`, 60 fotogramas en dos pasadas) que se reproduce con
 * el scroll. El fotograma sale de `sim.explosion`, el mismo valor suavizado
 * que movía las capas 3D, así que el scroll, el deslizador y los botones de
 * Tecnología la mueven igual que antes.
 *
 * Mientras se ve, el ratón 3D se oculta y los marcadores de hotspot se
 * colocan con las posiciones proyectadas desde la cámara de Blender
 * (`hotspots.json`). Fuera de Tecnología y con el ratón montado, vuelve el
 * 3D en vivo (Specs, Iluminación, Compra).
 */
const BASE = import.meta.glob<string>('../assets/despiece/base/*.webp', {
  import: 'default',
  query: '?url',
  eager: true,
})
const LUZ = import.meta.glob<string>('../assets/despiece/luz/*.webp', {
  import: 'default',
  query: '?url',
  eager: true,
})
const URLS_BASE = ordenarUrls(BASE)
const URLS_LUZ = ordenarUrls(LUZ)
const TOTAL = URLS_BASE.length
const ASPECTO = datosHotspots.aspecto
const POSICIONES = datosHotspots.hotspots as unknown as Record<string, [number, number][]>
/** Resolución de los renders: el lienzo no necesita más píxeles que estos. */
const ANCHO_RENDER = 1600

/** Orden de carga por bisección: montado, abierto, mitad, cuartos... */
function ordenCarga(total: number): number[] {
  const orden = [0, total - 1]
  const visto = new Set(orden)
  for (let paso = (total - 1) / 2; paso >= 1; paso /= 2) {
    for (let x = paso; x < total; x += paso) {
      const i = Math.round(x)
      if (!visto.has(i)) {
        visto.add(i)
        orden.push(i)
      }
    }
  }
  for (let i = 0; i < total; i++) if (!visto.has(i)) orden.push(i)
  return orden
}

type Props = { enTecnologia: boolean }

export function DespieceFoto({ enTecnologia }: Props) {
  const capa = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const enTech = useRef(enTecnologia)

  useEffect(() => {
    enTech.current = enTecnologia
  }, [enTecnologia])

  useEffect(() => {
    const div = capa.current
    const canvas = lienzo.current
    if (!div || !canvas || TOTAL === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const compositor = new CompositorFoto(ctx)

    // Rectángulo de la foto en la ventana: el 80 % del alto (el despiece
    // entero queda entre la barra de navegación y los controles) y, en
    // vertical, limitado para que el ratón montado quepa a lo ancho.
    const caja = { x: 0, y: 0, ancho: 0, alto: 0 }
    let sucio = true
    const medir = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      caja.alto = Math.min(vh * 0.8, vw / 0.62 / ASPECTO)
      caja.ancho = caja.alto * ASPECTO
      caja.x = (vw - caja.ancho) / 2
      caja.y = (vh - caja.alto) / 2 + vh * 0.035
      canvas.style.width = `${caja.ancho}px`
      canvas.style.height = `${caja.alto}px`
      canvas.style.left = `${caja.x}px`
      canvas.style.top = `${caja.y}px`
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const ancho = Math.min(ANCHO_RENDER, Math.round(caja.ancho * dpr))
      compositor.dimensionar(Math.max(1, ancho), Math.max(1, Math.round(ancho / ASPECTO)))
      sucio = true
    }
    medir()
    window.addEventListener('resize', medir)

    // Carga diferida: empieza cuando Tecnología se acerca.
    const fotogramas: Fotograma[] = new Array(TOTAL)
    const alCargar = () => {
      sucio = true
    }
    let temporizador = 0
    const cargarTodo = () => {
      if (temporizador) return
      const orden = ordenCarga(TOTAL)
      let siguiente = 0
      temporizador = window.setInterval(() => {
        for (let n = 0; n < 4 && siguiente < TOTAL; n++, siguiente++) {
          const i = orden[siguiente]
          fotogramas[i] = cargarFotograma(URLS_BASE[i], URLS_LUZ[i], alCargar)
        }
        if (siguiente >= TOTAL) window.clearInterval(temporizador)
      }, 60)
    }
    const seccion = document.getElementById('tecnologia')
    const vigia = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          cargarTodo()
          vigia.disconnect()
        }
      },
      { rootMargin: '150% 0px' },
    )
    if (seccion) vigia.observe(seccion)
    else cargarTodo()

    // Color: mismo barrido que el giro del héroe, al ritmo de la sobrecarga.
    let colorAntes = hexAcento(useUsoTienda.getState().acento)
    let colorAhora = colorAntes
    let cambiando = false
    const quitarAcento = useUsoTienda.subscribe((s) => {
      const nuevo = hexAcento(s.acento)
      if (nuevo === colorAhora) return
      colorAntes = colorAhora
      colorAhora = nuevo
      cambiando = !s.reducido
      if (!cambiando) colorAntes = nuevo
      sucio = true
    })

    let visible = false
    let ultimo = -1
    let raf = 0
    const bucle = () => {
      raf = requestAnimationFrame(bucle)
      const e = Math.min(1, Math.max(0, sim.explosion))
      const pos = e * (TOTAL - 1)
      const f = masCercano(fotogramas, Math.round(pos), false)
      const quiere = (enTech.current || e > 0.01) && f !== null
      if (quiere !== visible) {
        visible = quiere
        div.classList.toggle('despiece-foto--visible', visible)
        sim.fotoDespiece = visible
        sucio = true
      }
      if (!visible || !f) return

      // Marcadores: posición proyectada en Blender, interpolada entre
      // fotogramas para que sigan a las piezas sin saltos.
      const i0 = Math.floor(pos)
      const i1 = Math.min(TOTAL - 1, i0 + 1)
      const t = pos - i0
      for (const [id, lista] of Object.entries(POSICIONES)) {
        const a = lista[i0]
        const b = lista[i1]
        const ranura = marcadores.get(id) ?? ranuraMarcador(id)
        ranura.x = caja.x + (a[0] + (b[0] - a[0]) * t) * caja.ancho
        ranura.y = caja.y + (a[1] + (b[1] - a[1]) * t) * caja.alto
        ranura.z = 10
      }

      let barrido = 1
      if (cambiando) {
        barrido = onda.activo.value > 0 ? onda.progreso.value : 1
        sucio = true
        if (barrido >= 1) {
          cambiando = false
          colorAntes = colorAhora
        }
      }
      const indice = fotogramas.indexOf(f)
      if (!sucio && indice === ultimo) return
      compositor.pintar(f.base, f.luz, colorAntes, colorAhora, barrido)
      ultimo = indice
      sucio = false
    }
    raf = requestAnimationFrame(bucle)

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(temporizador)
      window.removeEventListener('resize', medir)
      vigia.disconnect()
      quitarAcento()
      sim.fotoDespiece = false
    }
  }, [])

  return (
    <div ref={capa} className="despiece-foto" aria-hidden="true">
      <canvas ref={lienzo} className="despiece-foto__lienzo" />
    </div>
  )
}
