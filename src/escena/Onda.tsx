import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { hexAcento, useUsoTienda } from '../estado/usoTienda'
import { avanzarOnda, lanzarOnda, onda } from './sobrecarga'

/**
 * Escucha el acento de la tienda y lanza la «sobrecarga»: una corriente de
 * luz recorre el ratón de la nariz a la cola al cambiar de color.
 *
 * Con movimiento reducido activo el cambio es instantáneo, sin barrido.
 * Este componente solo dispara y avanza el frente: los materiales emisivos
 * (parcheados con `aplicarOnda`/`parchearOnda`) hacen el resto en el shader.
 */
export function Onda() {
  const acento = useUsoTienda((s) => s.acento)
  const reducido = useUsoTienda((s) => s.reducido)
  const anterior = useRef(hexAcento(useUsoTienda.getState().acento))

  useEffect(() => {
    const nuevo = hexAcento(acento)
    if (reducido) {
      // Sin animación: corta cualquier barrido y adopta el color ya.
      onda.activo.value = 0
      anterior.current = nuevo
      return
    }
    if (nuevo === anterior.current) return
    lanzarOnda(anterior.current, nuevo)
    anterior.current = nuevo
  }, [acento, reducido])

  // Puente de depuración (solo en desarrollo).
  useEffect(() => {
    if (import.meta.env.DEV) {
      const puente = window as unknown as Record<string, unknown>
      puente.__voltaOnda = { onda, lanzarOnda, avanzarOnda }
    }
  }, [])

  useFrame((_, delta) => avanzarOnda(delta))
  return null
}
