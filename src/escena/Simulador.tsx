import { sim } from '../estado/sim'
import { useUsoTienda } from '../estado/usoTienda'
import { esponjar } from '../utiles/mates'

/**
 * Suaviza el objetivo de explosión que fijan el scroll y los controles.
 *
 * Es el único punto que escribe `sim.explosion`: así, si el scroll da un
 * salto (o el usuario suelta el deslizador), todas las capas, la cámara y el
 * despiece fotográfico se mueven con la misma inercia en lugar de
 * teletransportarse.
 *
 * Corre en su propio `requestAnimationFrame`, fuera del lienzo 3D: el
 * despiece fotográfico (Cycles) tiene que seguir al scroll también mientras
 * la GPU compila los shaders (el bucle del lienzo está parado) y en
 * navegadores sin WebGL. Devuelve la función que lo detiene.
 */
export function arrancarSimulador(): () => void {
  let raf = 0
  let previo = performance.now()
  const paso = (ahora: number) => {
    raf = requestAnimationFrame(paso)
    const delta = (ahora - previo) / 1000
    previo = ahora
    const objetivo = useUsoTienda.getState().objetivoExplosion
    if (Math.abs(sim.explosion - objetivo) < 0.0001) {
      sim.explosion = objetivo
      return
    }
    sim.explosion = esponjar(sim.explosion, objetivo, 4.5, delta)
  }
  raf = requestAnimationFrame(paso)
  return () => cancelAnimationFrame(raf)
}
