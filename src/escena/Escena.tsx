import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, ContactShadows, Sparkles } from '@react-three/drei'
import gsap from 'gsap'
import { sim } from '../estado/sim'
import { hexAcento, useUsoTienda } from '../estado/usoTienda'
import { Camara } from './Camara'
import { Efectos } from './Efectos'
import { Iluminacion } from './Iluminacion'
import { MarcadoresHotspot } from './MarcadoresHotspot'
import { Onda } from './Onda'
import { Raton } from './Raton'
import { Simulador } from './Simulador'

/**
 * El lienzo 3D: un único `<Canvas>` fijo que atraviesa toda la página.
 *
 * Decisiones clave:
 * - `frameloop="never"` cuando la escena queda tapada por las secciones
 *   opacas del final: el bucle de render se apaga y ahorra batería/GPU.
 * - `dpr` limitado a 1.5 (en retina son ~44 % menos píxeles) y `<AdaptiveDpr />`
 *   con `performance.regress`: el despiece en movimiento pide menos resolución
 *   y la recupera solo, un instante después de detenerse.
 * - `antialias` fuera: el postprocesado renderiza a sus propios targets, la
 *   bandera solo reservaba un buffer MSAA que nadie usaba.
 * - La sombra de contacto se hornea una vez por tramo de despiece (ver
 *   `SombraContacto`), en lugar de re-renderizar la escena entera cada frame.
 * - `touchAction: 'pan-y'` para que en móvil el dedo siga haciendo scroll
 *   aunque el lienzo ocupe toda la pantalla.
 * - La intro anima `sim.intro` con GSAP (fuera de React); la cámara la lee
 *   cada frame sin re-renders.
 */
/**
 * Sombra de contacto horneada: se renderiza una sola vez y solo se vuelve a
 * hornear al cruzar cada cuarto del despiece (`key`), en lugar de
 * re-renderizar toda la escena en profundidad en cada fotograma.
 */
function SombraContacto() {
  const nivel = useUsoTienda((s) => Math.round(s.objetivoExplosion * 4))
  return (
    <ContactShadows
      key={nivel}
      position={[0, 0.012, 0]}
      opacity={0.55}
      blur={2.6}
      far={3.2}
      scale={7}
      resolution={256}
      color="#000000"
      frames={1}
    />
  )
}

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
    <>
      <Canvas
        frameloop={activa ? 'always' : 'never'}
        dpr={[1, 1.5]}
        performance={{ min: 0.75, debounce: 260 }}
        camera={{ fov: 34, near: 0.1, far: 60, position: [0, 2.8, 8.8] }}
        gl={{
          alpha: true,
          antialias: false,
          stencil: false,
          powerPreference: 'high-performance',
        }}
        style={{ touchAction: 'pan-y' }}
      >
        <Simulador />
        <Iluminacion />
        <Raton />
        <Onda />

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
        <SombraContacto />

        <Camara />
        <AdaptiveDpr />
        <Efectos />
      </Canvas>

      {/* Puntos y tarjetas de los hotspots: HTML normal sobre el lienzo */}
      <MarcadoresHotspot />
    </>
  )
}
