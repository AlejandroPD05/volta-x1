import { useFrame } from '@react-three/fiber'
import { sim } from '../estado/sim'
import { useUsoTienda } from '../estado/usoTienda'
import { esponjar } from '../utiles/mates'

/**
 * Suaviza el objetivo de explosión que fijan el scroll y los controles.
 *
 * Es el único punto que escribe `sim.explosion`: así, si el scroll da un
 * salto (o el usuario suelta el deslizador), todas las capas y la cámara
 * se mueven con la misma inercia en lugar de teletransportarse.
 */
export function Simulador() {
  useFrame((_, delta) => {
    const objetivo = useUsoTienda.getState().objetivoExplosion
    sim.explosion = esponjar(sim.explosion, objetivo, 4.5, delta)
  })
  return null
}
