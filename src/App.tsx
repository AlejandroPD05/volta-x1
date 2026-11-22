import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { DespieceFoto } from './componentes/DespieceFoto'
import { Hero } from './componentes/Hero'
import { Nav } from './componentes/Nav'
import { Pie } from './componentes/Pie'
import { ScrollDirector } from './componentes/ScrollDirector'
import { SeccionColor } from './componentes/SeccionColor'
import { SeccionCompra } from './componentes/SeccionCompra'
import { SeccionSpecs } from './componentes/SeccionSpecs'
import { SeccionTecnologia } from './componentes/SeccionTecnologia'
import { MarcadoresHotspot } from './escena/MarcadoresHotspot'
import { useUsoTienda } from './estado/usoTienda'
import { arrancarSimulador } from './escena/Simulador'

export function App() {
  const [activa, setActiva] = useState(true)
  const [enTecnologia, setEnTecnologia] = useState(false)

  // Suavizado del despiece: un único bucle para toda la página.
  useEffect(() => arrancarSimulador(), [])

  // Preferencia de movimiento reducido.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    useUsoTienda.getState().definirReducido(mq.matches)
    const alCambiar = (e: MediaQueryListEvent) => useUsoTienda.getState().definirReducido(e.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  // Apaga el bucle 3D cuando el pie tapa la escena (ahorro de GPU/batería) y
  // limita los hotspots a Tecnología: su capa solo tiene sentido junto al
  // despiece y no debe flotar sobre Specs o Iluminación.
  useEffect(() => {
    let raf = 0
    const pie = document.querySelector('footer')
    const tech = document.getElementById('tecnologia')
    const medir = () => {
      if (pie) {
        const arriba = pie.getBoundingClientRect().top
        setActiva(arriba >= window.innerHeight * 0.4)
        // El escenario fijo se desvanece antes de que el pie lo corte.
        document.documentElement.classList.toggle('con-pie', arriba < window.innerHeight)
      }
      if (!tech) return
      const r = tech.getBoundingClientRect()
      const enTech = r.top < window.innerHeight && r.bottom > 0
      setEnTecnologia(enTech)
      if (!enTech) {
        const tienda = useUsoTienda.getState()
        if (tienda.hotspotActivo) tienda.cerrarHotspot()
      }
    }
    const alScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(medir)
    }
    window.addEventListener('scroll', alScroll, { passive: true })
    window.addEventListener('resize', alScroll)
    medir()
    return () => {
      window.removeEventListener('scroll', alScroll)
      window.removeEventListener('resize', alScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <>
        {/* Capas fijas: fondo, escenario (fotos de Cycles) y marcadores */}
        <div className="fondo-fijo" aria-hidden="true" />
        <DespieceFoto enTecnologia={enTecnologia} />
        {/* Los hotspots viven en su propia capa para poder quedar por encima
            del texto de la interfaz cuando su tarjeta se abre. */}
        <div className={`capa-hotspots${enTecnologia ? '' : ' capa-hotspots--oculta'}`}>
          <MarcadoresHotspot activa={activa && enTecnologia} />
        </div>

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
    </MotionConfig>
  )
}
