import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as ControladorOrbital } from 'three-stdlib'
import { sim } from '../estado/sim'
import { useUsoTienda } from '../estado/usoTienda'
import { esponjar, facil, mezclar } from '../utiles/mates'

/**
 * Director de cámara.
 *
 * - Intro: la cámara llega desde lejos (distancia y altura interpoladas por
 *   `sim.intro`, animado con GSAP) mientras el entorno se enciende.
 * - Explosión: el punto de mira sube y la cámara se aleja un poco para que
 *   todo el despiece quepa en pantalla; el usuario puede seguir orbitando.
 * - Reposo: tras 2,6 s sin tocar nada, el ratón gira solo. En táctil el
 *   arrastre está desactivado a propósito (el dedo hace scroll de página) y
 *   la auto-rotación siempre queda activa.
 */
export function Camara() {
  const controles = useRef<ControladorOrbital>(null)
  const camara = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const interaccion = useRef(0)
  // QA: distancia forzada (fotos macro del acabado); null = la del director.
  const distanciaFijada = useRef<number | null>(null)
  const reducido = useUsoTienda((s) => s.reducido)
  const fina = useMemo(() => window.matchMedia('(pointer: fine)').matches, [])

  useEffect(() => {
    const el = gl.domElement
    interaccion.current = performance.now()
    if (import.meta.env.DEV) {
      const puente = window as unknown as Record<string, unknown>
      puente.__voltaCamara = camara
      puente.__voltaControles = controles
      puente.__voltaGl = gl
      // Fija la distancia del director (capturas macro de QA): número o null.
      puente.__voltaDistancia = (d: number | null) => {
        distanciaFijada.current = d
      }
    }
    const marcar = () => {
      interaccion.current = performance.now()
    }
    el.addEventListener('pointerdown', marcar)
    el.addEventListener('pointermove', marcar)
    el.addEventListener('wheel', marcar, { passive: true })
    return () => {
      el.removeEventListener('pointerdown', marcar)
      el.removeEventListener('pointermove', marcar)
      el.removeEventListener('wheel', marcar)
    }
  }, [gl, camara])

  useFrame((_, delta) => {
    const c = controles.current
    if (!c) return

    // El punto de mira sube con la explosión (del suelo al centro del despiece).
    const alturaObjetivo = mezclar(mezclar(0.72, 0.4, facil(sim.intro)), 1.25, sim.explosion)
    c.target.x = esponjar(c.target.x, 0, 4, delta)
    c.target.y = esponjar(c.target.y, alturaObjetivo, 4, delta)
    c.target.z = esponjar(c.target.z, 0, 4, delta)

    // Distancia: lejos en la intro, cerca en reposo, atrás al explotar.
    const distanciaObjetivo =
      distanciaFijada.current ?? mezclar(8.8, 3.5, facil(sim.intro)) + 1.4 * sim.explosion
    const direccion = camara.position.clone().sub(c.target)
    const longitud = direccion.length()
    camara.position
      .copy(c.target)
      .addScaledVector(direccion.normalize(), esponjar(longitud, distanciaObjetivo, 4, delta))

    // Reorienta SIEMPRE hacia el objetivo: en táctil los controles están
    // desactivados y OrbitControls no ejecuta su update(), así que sin este
    // lookAt la cámara viajaría mirando al sitio equivocado.
    camara.lookAt(c.target)

    // Auto-rotación solo en reposo, sin tarjetas abiertas y fuera de la intro.
    const estado = useUsoTienda.getState()
    const ocioso = performance.now() - interaccion.current > 2600
    c.autoRotate =
      sim.intro > 0.97 && !estado.hotspotActivo && (!fina || ocioso) && !reducido
    c.autoRotateSpeed = sim.explosion > 0.05 ? 0.45 : 0.7
    c.enabled = fina && sim.intro > 0.6
  })

  return (
    <OrbitControls
      ref={controles}
      makeDefault
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0.35}
      maxPolarAngle={1.45}
      minDistance={2}
      maxDistance={12}
    />
  )
}
