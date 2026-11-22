import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group } from 'three'
import { HOTSPOTS } from '../datos/especificaciones'
import { sim } from '../estado/sim'
import { useUsoTienda } from '../estado/usoTienda'
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
/** Giro de presentación en tres cuartos. */
const GIRO_BASE = -0.5

export function Raton() {
  const raiz = useRef<Group>(null)
  const reducido = useUsoTienda((s) => s.reducido)
  const quieto = useRef(false)

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
    // Donde mandan las fotos de Cycles (giro del héroe, despiece) el 3D no
    // se dibuja.
    raiz.current.visible = !sim.fotoHeroe && !sim.fotoDespiece

    // Con movimiento reducido el modelo no flota: solo se actualiza la matriz
    // una vez (o cuando se vuelve a activar el movimiento).
    if (reducido) {
      if (quieto.current) return
      raiz.current.position.y = 0
      raiz.current.rotation.set(0, GIRO_BASE, 0)
      raiz.current.updateWorldMatrix(true, false)
      onda.invRaton.value.copy(raiz.current.matrixWorld).invert()
      quieto.current = true
      return
    }
    quieto.current = false

    const t = estado.clock.elapsedTime
    // Cambio de color: el ratón da una vuelta completa sobre sí mismo con un
    // pequeño salto mientras la sobrecarga recorre los LEDs (`Onda`).
    const p = onda.activo.value > 0 ? onda.progreso.value : 1
    const vuelta = p < 1 ? (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2) : 0
    const salto = Math.sin(Math.PI * p)
    raiz.current.rotation.y = GIRO_BASE + vuelta * Math.PI * 2
    raiz.current.rotation.z = salto * 0.06
    raiz.current.position.y =
      Math.sin(t * 0.9) * 0.014 * (1 - sim.explosion) + salto * 0.09 * (1 - sim.explosion)
    // La onda de acento se mide en coordenadas del ratón: mantén fresca la
    // inversa de su matriz para el shader de los materiales emisivos.
    raiz.current.updateWorldMatrix(true, false)
    onda.invRaton.value.copy(raiz.current.matrixWorld).invert()
  })

  return (
    <group ref={raiz} rotation={[0, GIRO_BASE, 0]}>
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
