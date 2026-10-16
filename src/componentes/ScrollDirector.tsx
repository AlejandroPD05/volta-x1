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
    const definir = (valor: number) => useUsoTienda.getState().definirObjetivo(valor)

    const tecnologia = ScrollTrigger.create({
      trigger: '#tecnologia',
      start: 'top 60%',
      end: 'bottom 100%',
      onUpdate: (self) => definir(self.progress),
      onLeave: () => definir(1),
      onLeaveBack: () => definir(0),
    })

    const color = ScrollTrigger.create({
      trigger: '#color',
      start: 'top 85%',
      end: 'top 15%',
      onUpdate: (self) => definir(1 - self.progress),
      onLeave: () => definir(0),
      onLeaveBack: () => definir(1),
    })

    // Las fuentes cambian las alturas al cargar: recalcular posiciones.
    document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => {
      tecnologia.kill()
      color.kill()
    }
  }, [])

  return null
}
