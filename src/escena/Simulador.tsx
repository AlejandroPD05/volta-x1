import { useFrame, useThree } from '@react-three/fiber'
import { sim } from '../estado/sim'
import { useUsoTienda } from '../estado/usoTienda'
import { esponjar } from '../utiles/mates'

/**
 * Suaviza el objetivo de explosión que fijan el scroll y los controles.
 *
 * Es el único punto que escribe `sim.explosion`: así, si el scroll da un
 * salto (o el usuario suelta el deslizador), todas las capas y la cámara
 * se mueven con la misma inercia en lugar de teletransportarse.
 *
 * Mientras el despiece viaja pide menos resolución (`regress`): el movimiento
 * tapa la pérdida de nitidez y `<AdaptiveDpr />` la devuelve solo, un instante
 * después de que todo se detenga.
 */
export function Simulador() {
  const regresar = useThree((s) => s.performance.regress)
  useFrame((_, delta) => {
    const objetivo = useUsoTienda.getState().objetivoExplosion
    if (Math.abs(sim.explosion - objetivo) > 0.02) regresar()
    sim.explosion = esponjar(sim.explosion, objetivo, 4.5, delta)
  })
  return null
}
