import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group } from 'three'
import { HOTSPOTS } from '../datos/especificaciones'
import { sim } from '../estado/sim'
import { onda } from './sobrecarga'
import { Hotspot } from './Hotspot'
import { CarcasaInferior } from './partes/CarcasaInferior'
import { Bateria } from './partes/Bateria'
import { Pcb } from './partes/Pcb'
import { RuedaScroll } from './partes/RuedaScroll'
import { Botones } from './partes/Botones'
import { CarcasaSuperior } from './partes/CarcasaSuperior'

/**
 * Ensamblaje del ratón: seis capas, de abajo arriba.
 *
 *   6. CarcasaInferior  → base + skates PTFE (no se mueve: es el suelo)
 *   5. Bateria          → LiPo + módulo 2.4G
 *   4. Pcb              → sensor, MCU y LEDs
 *   3. Botones          → switches ópticos + botones laterales
 *   2. RuedaScroll      → rueda + encoder
 *   1. CarcasaSuperior  → cubierta, botones y cuna (la última en salir)
 *
 * El giro inicial en Y presenta el ratón en tres cuartos; la flotación
 * suave (seno) solo actúa cuando está montado, para que la vista
 * explosionada quede inmóvil y legible.
 */
export function Raton() {
  const raiz = useRef<Group>(null)

  // Puente de depuración (solo en desarrollo).
  useEffect(() => {
    if (import.meta.env.DEV) {
      const puente = window as unknown as Record<string, unknown>
      puente.__voltaRaton = raiz
      puente.__voltaThree = THREE
    }
  }, [])

  useFrame((estado) => {
    if (!raiz.current) return
    const t = estado.clock.elapsedTime
    raiz.current.position.y = Math.sin(t * 0.9) * 0.014 * (1 - sim.explosion)
    // La onda de acento se mide en coordenadas del ratón: mantén fresca la
    // inversa de su matriz para el shader de los materiales emisivos.
    raiz.current.updateWorldMatrix(true, false)
    onda.invRaton.value.copy(raiz.current.matrixWorld).invert()
  })

  return (
    <group ref={raiz} rotation={[0, -0.5, 0]}>
      <CarcasaInferior />
      <Bateria />
      <Pcb />
      <RuedaScroll />
      <Botones />
      <CarcasaSuperior />

      {/* Los hotspots viven DENTRO del grupo: así giran, flotan y se
          descomponen pegados a sus piezas, no en coordenadas de mundo. */}
      {HOTSPOTS.map((dato) => (
        <Hotspot key={dato.id} dato={dato} />
      ))}
    </group>
  )
}
