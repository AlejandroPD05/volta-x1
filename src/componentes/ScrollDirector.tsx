import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useUsoTienda } from '../estado/usoTienda'

gsap.registerPlugin(ScrollTrigger)

/**
 * Puente entre el scroll de la página y la escena 3D.
 *
 * En lugar de animar propiedades de GSAP, cada ScrollTrigger escribe el
 * objetivo (`objetivoExplosion`) en la tienda; el suavizado real ocurre en
 * `Simulador` dentro del bucle 3D. Así el scroll, el deslizador y los
 * botones comparten un único camino y nada "salta".
 *
 *   • #tecnologia → 0 .. 1  (se descompone mientras la recorres)
 *   • #color      → 1 .. 0  (se vuelve a montar al llegar a la iluminación)
 */
export function ScrollDirector() {
  useEffect(() => {
    // El objetivo se deduce SIEMPRE del progreso de ambos tramos, nunca de
    // eventos sueltos: al cargar, las secciones aún no tienen su altura final
    // (fuentes, Suspense del GLB) y al recalcular ScrollTrigger disparaba un
    // `onLeaveBack` del tramo de color que dejaba el ratón despiezado en el
    // héroe. Con el estado derivado, scroll 0 ⇒ ratón montado, pase lo que pase.
    let tecnologia: ScrollTrigger | null = null
    let color: ScrollTrigger | null = null
    const actualizar = () => {
      const pTecnologia = tecnologia?.progress ?? 0
      const pColor = color?.progress ?? 0
      const objetivo = pColor > 0 ? 1 - pColor : pTecnologia
      useUsoTienda.getState().definirObjetivo(objetivo)
    }

    tecnologia = ScrollTrigger.create({
      trigger: '#tecnologia',
      start: 'top 60%',
      end: 'bottom 100%',
      onUpdate: actualizar,
      onToggle: actualizar,
      onRefresh: actualizar,
    })

    color = ScrollTrigger.create({
      trigger: '#color',
      start: 'top 85%',
      end: 'top 15%',
      onUpdate: actualizar,
      onToggle: actualizar,
      onRefresh: actualizar,
    })
    actualizar()

    // Las fuentes cambian las alturas al cargar: recalcular posiciones.
    document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => {
      tecnologia?.kill()
      color?.kill()
    }
  }, [])

  return null
}
