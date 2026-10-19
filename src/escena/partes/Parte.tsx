import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { sim } from '../../estado/sim'
import { esponjar, escalonSuave, progresoPorRetardo } from '../../utiles/mates'

type Props = {
  /** Desplazamiento de la capa cuando la explosión llega a 1. */
  desplazamiento: [number, number, number]
  /** Retardo 0..0.9: cuándo arranca esta capa dentro de la explosión global. */
  retardo?: number
  /** Giro extra (radianes) al final del recorrido, para dar vida al despiece. */
  giro?: [number, number, number]
  children: ReactNode
}

/**
 * Envoltorio de una capa del ratón.
 *
 * La lógica de separación vive aquí: cada capa conoce su desplazamiento
 * final y un retardo, y en cada frame lee `sim.explosion` (valor continuo
 * fuera de React, sin re-renders) y coloca su grupo en
 * `desplazamiento × progreso`. El suavizado por capa hace que todas
 * arranquen y frenen con una inercia agradable aunque el scroll salte.
 *
 * (Se probó a cocer las mallas de cada capa en una sola por material para
 * recortar llamadas de dibujo, pero cada pieza tiene su propio color, brillo
 * y rugosidad: sin tocar el aspecto no se ahorraba nada, así que el despiece
 * se deja tal cual.)
 */
export function Parte({ desplazamiento, retardo = 0, giro = [0, 0, 0], children }: Props) {
  const grupo = useRef<Group>(null)
  const progreso = useRef(0)

  useFrame((_, delta) => {
    const g = grupo.current
    if (!g) return
    const objetivo = escalonSuave(progresoPorRetardo(sim.explosion, retardo))
    progreso.current = esponjar(progreso.current, objetivo, 9, delta)
    const p = progreso.current
    g.position.set(desplazamiento[0] * p, desplazamiento[1] * p, desplazamiento[2] * p)
    g.rotation.set(giro[0] * p, giro[1] * p, giro[2] * p)
  })

  return <group ref={grupo}>{children}</group>
}
