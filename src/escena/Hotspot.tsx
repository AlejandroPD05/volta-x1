import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import type { HotspotDato } from '../datos/especificaciones'
import { marcadores, ranuraMarcador } from '../estado/sim'

type Props = {
  dato: HotspotDato
}

/**
 * Rango de z-index de los marcadores por distancia a cámara (constante: no
 * tiene sentido recalcularlo en cada fotograma y cada array reservado cuenta).
 */
const RANGO_Z: readonly [number, number] = [20, 0]

/**
 * Ancla 3D de un marcador de hotspot.
 *
 * No pinta nada: en cada frame proyecta su posición de mundo a píxeles y la
 * escribe en su ranura de `marcadores`. La capa DOM (`MarcadoresHotspot`,
 * montada junto al Canvas en `Escena`) es la que dibuja el punto y la
 * tarjeta, ya en el árbol normal de React. Antes se usaba el `Html` de drei,
 * que monta una raíz de render por marcador y en esta escena perdía el
 * contenido de uno de los seis (el de la carcasa superior) tanto en
 * desarrollo como en la build.
 */
export function Hotspot({ dato }: Props) {
  const ancla = useRef<Group>(null)
  const mundo = useRef(new Vector3())
  const camara = useThree((s) => s.camera)
  const tamano = useThree((s) => s.size)

  useFrame(() => {
    const g = ancla.current
    if (!g) return
    g.updateWorldMatrix(true, false)
    mundo.current.setFromMatrixPosition(g.matrixWorld)
    const distancia = mundo.current.distanceTo(camara.position)
    mundo.current.project(camara)

    // Ranura estable del marcador (se crea la primera vez): escribir aquí y
    // no en render evita mutaciones fuera del ciclo de React.
    const ranura = marcadores.get(dato.id) ?? ranuraMarcador(dato.id)
    ranura.x = ((mundo.current.x + 1) / 2) * tamano.width
    ranura.y = ((1 - mundo.current.y) / 2) * tamano.height

    // z-index por distancia (mismo rango que usaba drei): los puntos más
    // cercanos a la cámara quedan por delante de los lejanos.
    const a = (RANGO_Z[1] - RANGO_Z[0]) / (camara.far - camara.near)
    ranura.z = Math.round(a * distancia + (RANGO_Z[1] - a * camara.far))
  })

  return <group ref={ancla} position={dato.posicion} />
}
