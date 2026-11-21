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
  /**
   * Capa que vive entera dentro del casco: con el ratón montado no se ve,
   * así que deja de dibujarse (en una iGPU las ~120 piezas internas costaban
   * más de 4 ms por frame sin aportar un solo píxel).
   */
  interior?: boolean
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
export function Parte({
  desplazamiento,
  retardo = 0,
  giro = [0, 0, 0],
  interior = false,
  children,
}: Props) {
  const grupo = useRef<Group>(null)
  const progreso = useRef(0)

  useFrame((_, delta) => {
    const g = grupo.current
    if (!g) return
    const objetivo = escalonSuave(progresoPorRetardo(sim.explosion, retardo))
    // Se oculta solo con todo montado (y ya compilada: este bucle no corre
    // hasta que `precompilar` termina, así que sus shaders están listos).
    if (interior) g.visible = sim.explosion > 0.0005 || progreso.current > 0
    // En reposo no se reescriben posición y rotación en cada fotograma.
    if (progreso.current === objetivo) return
    progreso.current = esponjar(progreso.current, objetivo, 9, delta)
    if (Math.abs(progreso.current - objetivo) < 0.0001) progreso.current = objetivo
    const p = progreso.current
    g.position.set(desplazamiento[0] * p, desplazamiento[1] * p, desplazamiento[2] * p)
    g.rotation.set(giro[0] * p, giro[1] * p, giro[2] * p)
  })

  return <group ref={grupo}>{children}</group>
}

/**
 * Piezas internas dentro de una capa que también tiene piezas exteriores
 * (los switches junto a los botones laterales, el encoder junto a la
 * rueda): solo se dibujan mientras el ratón está abierto.
 */
export function SoloDespiece({ children }: { children: ReactNode }) {
  const grupo = useRef<Group>(null)
  useFrame(() => {
    if (grupo.current) grupo.current.visible = sim.explosion > 0.0005
  })
  return <group ref={grupo}>{children}</group>
}
