import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Sparkles } from '@react-three/drei'
import gsap from 'gsap'
import { sim } from '../estado/sim'
import { hexAcento, useUsoTienda } from '../estado/usoTienda'
import { Camara } from './Camara'
import { Efectos } from './Efectos'
import { Iluminacion } from './Iluminacion'
import { Raton } from './Raton'
import { Simulador } from './Simulador'

/**
 * El lienzo 3D: un único `<Canvas>` fijo que atraviesa toda la página.
 *
 * Decisiones clave:
 * - `frameloop="never"` cuando la escena queda tapada por las secciones
 *   opacas del final: el bucle de render se apaga y ahorra batería/GPU.
 * - `touchAction: 'pan-y'` para que en móvil el dedo siga haciendo scroll
 *   aunque el lienzo ocupe toda la pantalla.
 * - La intro anima `sim.intro` con GSAP (fuera de React); la cámara la lee
 *   cada frame sin re-renders.
 */
export function Escena({ activa }: { activa: boolean }) {
  const acento = useUsoTienda((s) => s.acento)
  const reducido = useUsoTienda((s) => s.reducido)
  const introCompleta = useUsoTienda((s) => s.introCompleta)
  const hex = hexAcento(acento)

  useEffect(() => {
    if (reducido) {
      sim.intro = 1
      useUsoTienda.getState().completarIntro()
      return
    }
    const tween = gsap.to(sim, {
      intro: 1,
      duration: 2.6,
      delay: 0.35,
      ease: 'power3.out',
      onComplete: () => useUsoTienda.getState().completarIntro(),
    })
    return () => {
      tween.kill()
    }
  }, [reducido])

  return (
    <Canvas
      frameloop={activa ? 'always' : 'never'}
      dpr={[1, 2]}
      camera={{ fov: 34, near: 0.1, far: 60, position: [0, 2.8, 8.8] }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
    >
      <Simulador />
      <Iluminacion />
      <Raton />

      {/* Chispas de neón durante la intro */}
      {!introCompleta && (
        <Sparkles
          count={130}
          scale={[5.5, 3.4, 5.5]}
          size={2.6}
          speed={0.55}
          opacity={1}
          color={hex}
          position={[0, 0.4, 0]}
        />
      )}

      {/* Sombra de contacto suave (blob) en el suelo, sin shadow maps */}
      <ContactShadows
        position={[0, 0.012, 0]}
        opacity={0.55}
        blur={2.6}
        far={3.2}
        scale={7}
        resolution={512}
        color="#000000"
      />

      <Camara />
      <Efectos />
    </Canvas>
  )
}
