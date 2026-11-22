import { useEffect, useRef } from 'react'
import datosDespiece from '../assets/despiece/hotspots.json'
import datosGiro from '../assets/despiece/giro/hotspots.json'
import { marcadores, ranuraMarcador, sim } from '../estado/sim'
import { useUsoTienda } from '../estado/usoTienda'
import { esponjar } from '../utiles/mates'
import { centroEscenario } from '../utiles/escenario'
import {
  CompositorFoto,
  cargarFotograma,
  faseOnda,
  masCercano,
  ordenarUrls,
  type Fotograma,
} from './fotoCompuesta'

/**
 * El escenario fijo de la página, todo en fotos de Cycles en dos pasadas que
 * se componen con la onda RGB (`CompositorFoto`):
 *
 * - la explosión (60 fotogramas) se reproduce con el scroll: el fotograma sale
 *   de `sim.explosion`, el mismo valor suavizado que movía las capas 3D, así
 *   que el scroll, el deslizador y los botones de Tecnología la mueven igual;
 * - con el ratón despiezado del todo, una vuelta de 360° (72 fotogramas, el
 *   primero es el último de la explosión) se arrastra, se gira con las
 *   flechas y rota sola en reposo. Al volver a montarlo, primero regresa al
 *   frente y después se cierra.
 *
 * - fuera de Tecnología y con el ratón montado (Iluminación, Compra), el
 *   mismo giro del héroe (`modelado/giro.py`): su primer fotograma es el
 *   primero de la explosión, así que pasa de uno a otro sin salto.
 *
 * Se ve en toda la página salvo en el héroe, que tiene su propio giro. Los
 * marcadores de hotspot se colocan con las posiciones proyectadas desde la
 * cámara de Blender (`hotspots.json`).
 */
// Vite exige las opciones de `import.meta.glob` escritas literalmente.
const URLS_BASE = ordenarUrls(
  import.meta.glob<string>('../assets/despiece/base/*.webp', {
    import: 'default',
    query: '?url',
    eager: true,
  }),
)
const URLS_LUZ = ordenarUrls(
  import.meta.glob<string>('../assets/despiece/luz/*.webp', {
    import: 'default',
    query: '?url',
    eager: true,
  }),
)
const URLS_GIRO_BASE = ordenarUrls(
  import.meta.glob<string>('../assets/despiece/giro/base/*.webp', {
    import: 'default',
    query: '?url',
    eager: true,
  }),
)
const URLS_GIRO_LUZ = ordenarUrls(
  import.meta.glob<string>('../assets/despiece/giro/luz/*.webp', {
    import: 'default',
    query: '?url',
    eager: true,
  }),
)
const URLS_MONTADO_BASE = ordenarUrls(
  import.meta.glob<string>('../assets/giro/base/*.webp', {
    import: 'default',
    query: '?url',
    eager: true,
  }),
)
const URLS_MONTADO_LUZ = ordenarUrls(
  import.meta.glob<string>('../assets/giro/luz/*.webp', {
    import: 'default',
    query: '?url',
    eager: true,
  }),
)
const TOTAL = URLS_BASE.length
const TOTAL_MONTADO = URLS_MONTADO_BASE.length
const TOTAL_GIRO = URLS_GIRO_BASE.length
const ASPECTO = datosDespiece.aspecto
type Posiciones = Record<string, [number, number][]>
const POS_DESPIECE = datosDespiece.hotspots as unknown as Posiciones
const POS_GIRO = datosGiro.hotspots as unknown as Posiciones
/** Resolución de los renders: el lienzo no necesita más píxeles que estos. */
const ANCHO_RENDER = 1600
/** A partir de aquí el ratón se considera despiezado y se puede girar. */
const DESPIEZADO = 0.985
/** Píxeles de arrastre por fotograma del giro (5° por fotograma). */
const PX_POR_FOTOGRAMA = 7
/** Segundos por fotograma en la rotación automática (vuelta en ~14 s). */
const PASO_AUTO = 0.2
/** Por debajo de aquí el ratón está montado y gira como en el héroe. */
const MONTADO = 0.005

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

/** Orden de carga del giro: el frente y luego sus vecinos a cada lado. */
function ordenGiro(total: number): number[] {
  const orden = [0]
  for (let d = 1; orden.length < total; d++) {
    orden.push(d % total)
    if (orden.length < total) orden.push((total - d) % total)
  }
  return orden
}

const modulo = (v: number, n: number) => ((v % n) + n) % n

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
      caja.x = centroEscenario(vw) - caja.ancho / 2
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

    // Carga diferida: empieza cuando Tecnología se acerca; el giro, después
    // de la explosión.
    const fotogramas: Fotograma[] = new Array(TOTAL)
    const giro: Fotograma[] = new Array(TOTAL_GIRO)
    const montado: Fotograma[] = new Array(TOTAL_MONTADO)
    const alCargar = () => {
      sucio = true
    }
    const cola = [
      ...ordenCarga(TOTAL).map((i) => () => {
        fotogramas[i] = cargarFotograma(URLS_BASE[i], URLS_LUZ[i], alCargar)
      }),
      ...ordenGiro(TOTAL_GIRO).map((i) => () => {
        giro[i] = cargarFotograma(URLS_GIRO_BASE[i], URLS_GIRO_LUZ[i], alCargar)
      }),
      // Los del héroe: casi siempre llegan ya de la caché.
      ...ordenGiro(TOTAL_MONTADO).map((i) => () => {
        montado[i] = cargarFotograma(URLS_MONTADO_BASE[i], URLS_MONTADO_LUZ[i], alCargar)
      }),
    ]
    let temporizador = 0
    const cargarTodo = () => {
      if (temporizador) return
      let siguiente = 0
      temporizador = window.setInterval(() => {
        for (let n = 0; n < 4 && siguiente < cola.length; n++, siguiente++) cola[siguiente]()
        if (siguiente >= cola.length) window.clearInterval(temporizador)
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

    // Giro del ratón despiezado (en fotogramas del giro, continuo) y giro del
    // ratón montado fuera de Tecnología.
    let angulo = 0
    let anguloMontado = 0
    let girable = false
    let arrastrando = false
    let xInicio = 0
    let anguloInicio = 0
    let ultimoMovimiento = 0
    const alPulsar = (e: PointerEvent) => {
      if (!girable) return
      arrastrando = true
      xInicio = e.clientX
      anguloInicio = angulo
      ultimoMovimiento = performance.now()
      canvas.setPointerCapture(e.pointerId)
    }
    const alMover = (e: PointerEvent) => {
      if (!arrastrando) return
      angulo = anguloInicio - (e.clientX - xInicio) / PX_POR_FOTOGRAMA
      ultimoMovimiento = performance.now()
    }
    const alSoltar = (e: PointerEvent) => {
      arrastrando = false
      ultimoMovimiento = performance.now()
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }
    const alTecla = (e: KeyboardEvent) => {
      if (!girable) return
      if (e.key === 'ArrowLeft') angulo += 2
      else if (e.key === 'ArrowRight') angulo -= 2
      else return
      e.preventDefault()
      ultimoMovimiento = performance.now()
    }
    canvas.addEventListener('pointerdown', alPulsar)
    canvas.addEventListener('pointermove', alMover)
    canvas.addEventListener('pointerup', alSoltar)
    canvas.addEventListener('pointercancel', alSoltar)
    canvas.addEventListener('keydown', alTecla)

    const colocarMarcadores = (
      posiciones: Posiciones,
      pos: number,
      total: number,
      ciclico: boolean,
    ) => {
      // Interpolados entre fotogramas para que sigan a las piezas sin saltos.
      const i0 = Math.floor(pos)
      const t = pos - i0
      const a0 = ciclico ? modulo(i0, total) : i0
      const a1 = ciclico ? modulo(i0 + 1, total) : Math.min(total - 1, i0 + 1)
      for (const [id, lista] of Object.entries(posiciones)) {
        const a = lista[a0]
        const b = lista[a1]
        const ranura = marcadores.get(id) ?? ranuraMarcador(id)
        ranura.x = caja.x + (a[0] + (b[0] - a[0]) * t) * caja.ancho
        ranura.y = caja.y + (a[1] + (b[1] - a[1]) * t) * caja.alto
        ranura.z = 10
      }
    }

    let visible = false
    let ultimo: Fotograma | null = null
    let raf = 0
    let previo = performance.now()
    let pintado = 0
    const bucle = (ahora: number) => {
      raf = requestAnimationFrame(bucle)
      const delta = Math.min(0.1, (ahora - previo) / 1000)
      previo = ahora
      const e = Math.min(1, Math.max(0, sim.explosion))
      const pos = e * (TOTAL - 1)
      const quiere = !sim.fotoHeroe && masCercano(fotogramas, Math.round(pos), false) !== null
      if (quiere !== visible) {
        visible = quiere
        div.classList.toggle('despiece-foto--visible', visible)
        sim.fotoDespiece = visible
        sucio = true
      }
      if (!visible) return

      // ¿Despiezado del todo? Entonces se puede girar; si no, el giro vuelve
      // al frente (por el camino corto) antes de seguir con la explosión.
      const estado = useUsoTienda.getState()
      const ahoraGirable = e >= DESPIEZADO && TOTAL_GIRO > 0
      if (ahoraGirable !== girable) {
        girable = ahoraGirable
        div.classList.toggle('despiece-foto--girable', girable)
        canvas.tabIndex = girable ? 0 : -1
        if (!girable) arrastrando = false
      }
      if (girable) {
        const ocioso = !arrastrando && ahora - ultimoMovimiento > 2500
        if (ocioso && !estado.reducido && !estado.hotspotActivo) angulo += delta / PASO_AUTO
      } else if (angulo !== 0) {
        const destino = Math.round(angulo / TOTAL_GIRO) * TOTAL_GIRO
        angulo = esponjar(angulo, destino, 9, delta)
        if (Math.abs(angulo - destino) < 0.05) angulo = 0
      }

      // Montado y fuera de Tecnología, gira como en el héroe; al volver a
      // Tecnología regresa al frente antes de que empiece la explosión.
      if (e <= MONTADO && !enTech.current && !estado.reducido && TOTAL_MONTADO > 0) {
        anguloMontado += delta / PASO_AUTO
      } else if (anguloMontado !== 0) {
        const destino = Math.round(anguloMontado / TOTAL_MONTADO) * TOTAL_MONTADO
        anguloMontado = esponjar(anguloMontado, destino, 9, delta)
        if (Math.abs(anguloMontado - destino) < 0.05) anguloMontado = 0
      }

      let f: Fotograma | null
      const enGiro = angulo !== 0 || (girable && giro[0]?.listo)
      if (anguloMontado !== 0) {
        const indice = modulo(Math.round(anguloMontado), TOTAL_MONTADO)
        f = masCercano(montado, indice, true) ?? masCercano(fotogramas, 0, false)
      } else if (enGiro) {
        const indice = modulo(Math.round(angulo), TOTAL_GIRO)
        f = masCercano(giro, indice, true) ?? masCercano(fotogramas, TOTAL - 1, false)
        colocarMarcadores(POS_GIRO, modulo(angulo, TOTAL_GIRO), TOTAL_GIRO, true)
      } else {
        f = masCercano(fotogramas, Math.round(pos), false)
        colocarMarcadores(POS_DESPIECE, pos, TOTAL, false)
      }
      if (!f) return

      // La onda RGB se mueve sola: se repinta a 30 fps como mucho.
      if (!estado.reducido && ahora - pintado > 33) sucio = true
      if (!sucio && f === ultimo) return
      compositor.pintar(f.base, f.luz, faseOnda(ahora, estado.reducido))
      ultimo = f
      pintado = ahora
      sucio = false
    }
    raf = requestAnimationFrame(bucle)

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(temporizador)
      window.removeEventListener('resize', medir)
      vigia.disconnect()
      canvas.removeEventListener('pointerdown', alPulsar)
      canvas.removeEventListener('pointermove', alMover)
      canvas.removeEventListener('pointerup', alSoltar)
      canvas.removeEventListener('pointercancel', alSoltar)
      canvas.removeEventListener('keydown', alTecla)
      sim.fotoDespiece = false
    }
  }, [])

  return (
    <div ref={capa} className="despiece-foto">
      <canvas
        ref={lienzo}
        className="despiece-foto__lienzo"
        role="img"
        tabIndex={-1}
        aria-label="VOLTA X1 despiezado: carcasa, botones, rueda, PCB, batería y base. Con el ratón abierto del todo, arrastra o usa las flechas para girarlo."
      />
    </div>
  )
}
