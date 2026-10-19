import { useEffect, useState } from 'react'
import { Cursor } from './componentes/Cursor'
import { Hero } from './componentes/Hero'
import { Nav } from './componentes/Nav'
import { Pie } from './componentes/Pie'
import { ScrollDirector } from './componentes/ScrollDirector'
import { SeccionColor } from './componentes/SeccionColor'
import { SeccionCompra } from './componentes/SeccionCompra'
import { SeccionSpecs } from './componentes/SeccionSpecs'
import { SeccionTecnologia } from './componentes/SeccionTecnologia'
import { Escena } from './escena/Escena'
import { ACENTOS, useUsoTienda } from './estado/usoTienda'

/** Aviso mínimo cuando el navegador no puede crear un contexto WebGL. */
function SinWebgl() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <p className="cristal texto-apagado max-w-sm rounded-2xl p-6 text-center text-sm">
        Tu navegador no puede dibujar la escena 3D (WebGL desactivado). Actívalo para
        ver el VOLTA X1 despiezado en directo.
      </p>
    </div>
  )
}

export function App() {
  const acento = useUsoTienda((s) => s.acento)
  const [activa, setActiva] = useState(true)
  const [webgl] = useState(() => {
    try {
      const lienzo = document.createElement('canvas')
      return Boolean(lienzo.getContext('webgl2') ?? lienzo.getContext('webgl'))
    } catch {
      return false
    }
  })

  // El acento se propaga a toda la interfaz vía variables CSS.
  useEffect(() => {
    const { hex, suave } = ACENTOS[acento]
    const raiz = document.documentElement
    raiz.style.setProperty('--acento', hex)
    raiz.style.setProperty('--acento-suave', suave)
  }, [acento])

  // Preferencia de movimiento reducido.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    useUsoTienda.getState().definirReducido(mq.matches)
    const alCambiar = (e: MediaQueryListEvent) => useUsoTienda.getState().definirReducido(e.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  // Apaga el bucle 3D cuando el pie tapa la escena (ahorro de GPU/batería).
  useEffect(() => {
    let raf = 0
    const medir = () => {
      const pie = document.querySelector('footer')
      if (!pie) return
      setActiva(pie.getBoundingClientRect().top >= window.innerHeight * 0.4)
    }
    const alScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(medir)
    }
    window.addEventListener('scroll', alScroll, { passive: true })
    medir()
    return () => {
      window.removeEventListener('scroll', alScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      {/* Capas fijas: fondo → viñeta → escena 3D → ruido */}
      <div className="fondo-fijo" aria-hidden="true" />
      <div className="vineta" aria-hidden="true" />
      <div className="escena-fija">{webgl ? <Escena activa={activa} /> : <SinWebgl />}</div>
      <Cursor />
      <div className="ruido" aria-hidden="true" />

      <Nav />
      <ScrollDirector />

      <main className="capa-ui">
        <Hero />
        <SeccionTecnologia />
        <SeccionSpecs />
        <SeccionColor />
        <SeccionCompra />
      </main>

      <div className="capa-ui">
        <Pie />
      </div>
    </>
  )
}
