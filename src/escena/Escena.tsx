import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Sparkles } from '@react-three/drei'
import gsap from 'gsap'
import { sim } from '../estado/sim'
import { hexAcento, useUsoTienda } from '../estado/usoTienda'
import { Camara } from './Camara'
import { Efectos } from './Efectos'
import { Iluminacion } from './Iluminacion'
import { Onda } from './Onda'
import { Raton } from './Raton'
import { Simulador } from './Simulador'
import { precompilarShaders } from './precompilar'

/**
 * El lienzo 3D: un único `<Canvas>` fijo que atraviesa toda la página.
 *
 * Decisiones clave:
 * - `frameloop="never"` mientras los shaders se compilan y cuando la escena
 *   queda tapada por las secciones opacas del final: el bucle de render no
 *   gasta ni un frame de más.
 * - La compilación de shaders va por bloques, con la cola del driver corta
 *   (ver `precompilar.ts`): la página sigue viva mientras la GPU prepara los
 *   programas, en vez de congelarse.
 * - `dpr` limitado a 1.25 y fijo. Antes un vigilante pedía menos resolución
 *   cuando la media de fotogramas pasaba de 17 ms, pero cada cambio de `dpr`
 *   redimensiona el lienzo (se borra el búfer) y se veía un parpadeo; en una
 *   GPU normal no hacía falta y en una lenta el tope fijo ya protege.
 * - `antialias` fuera: el postprocesado renderiza a sus propios targets, la
 *   bandera solo reservaba un buffer MSAA que nadie usaba.
 * - La sombra de contacto se hornea una vez por tramo de despiece (ver
 *   `SombraContacto`), en lugar de re-renderizar la escena entera cada frame.
 * - `touchAction: 'pan-y'` para que en móvil el dedo siga haciendo scroll
 *   aunque el lienzo ocupe toda la pantalla.
 * - La intro anima `sim.intro` con GSAP (fuera de React); la cámara la lee
 *   cada frame sin re-renders. Arranca cuando la escena ya puede verse, no
 *   antes.
 */

/**
 * Compila los shaders antes de encender el bucle.
 *
 * Medido con perfilador: la escena obliga al driver a compilar decenas de
 * programas (~3 s de hilo principal en una GPU de escritorio) porque casi
 * cada material estrena una combinación de mapas distinta. `precompilar`
 * los reparte en lotes para que el driver trabaje en paralelo sin que la
 * consulta de estado bloquee la página (ver `precompilar.ts`). Sin la
 * extensión `KHR_parallel_shader_compile` compila igual que siempre.
 */
function Compilador({ alEstarListo }: { alEstarListo: () => void }) {
  const gl = useThree((s) => s.gl)
  const escena = useThree((s) => s.scene)
  const camara = useThree((s) => s.camera)

  useEffect(() => {
    let vivo = true
    void precompilarShaders(gl, escena, camara, () => vivo).then(() => {
      if (vivo) alEstarListo()
    })
    return () => {
      vivo = false
    }
  }, [gl, escena, camara, alEstarListo])

  return null
}

/**
 * Los primeros fotogramas terminan de compilar lo que vive fuera de la
 * escena (las pasadas del postprocesado, la horneada de la sombra de
 * contacto, los formadores de luz del entorno). Son unos pocos programas y
 * unos pocos frames: la escena queda encendida pero el aviso de carga y la
 * intro esperan a que el bucle ya rueda de verdad.
 */
function Calentador({ activo, alEstarListo }: { activo: boolean; alEstarListo: () => void }) {
  const fotogramas = useRef(0)

  useFrame(() => {
    if (!activo) return
    fotogramas.current += 1
    if (fotogramas.current === 4) alEstarListo()
  })

  return null
}

/**
 * Sombra de contacto horneada: se renderiza una sola vez y solo se vuelve a
 * hornear cuando el despiece se detiene en un tramo nuevo, en lugar de
 * re-renderizar toda la escena en profundidad en cada fotograma. El retardo
 * de 180 ms evita hornear los tramos intermedios de un scroll rápido.
 */
function SombraContacto() {
  const nivel = useUsoTienda((s) => Math.round(s.objetivoExplosion * 4))
  const [horneado, setHorneado] = useState(nivel)

  useEffect(() => {
    const temporizador = window.setTimeout(() => setHorneado(nivel), 180)
    return () => window.clearTimeout(temporizador)
  }, [nivel])

  return (
    <ContactShadows
      key={horneado}
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
  // `compilado`: shaders listos, el bucle puede encenderse.
  // `lista`: además han corrido unos frames, así que el postprocesado y la
  // sombra de contacto también están compilados y hay algo que enseñar.
  const [compilado, setCompilado] = useState(false)
  const [lista, setLista] = useState(false)
  const alEstarCompilado = useCallback(() => setCompilado(true), [])
  const alEstarListo = useCallback(() => setLista(true), [])

  // La intro arranca cuando la escena puede verse de verdad: si empezara al
  // montar, se gastaría mientras los shaders aún se están compilando.
  useEffect(() => {
    if (!lista) return
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
  }, [lista, reducido])

  return (
    <>
      <Canvas
        frameloop={activa && compilado ? 'always' : 'never'}
        dpr={[1, 1.25]}
        camera={{ fov: 34, near: 0.1, far: 60, position: [0, 2.8, 8.8] }}
        gl={{
          alpha: true,
          antialias: false,
          stencil: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl: renderer }) => {
          // En producción no hace falta el diagnóstico de shaders: `three`
          // consulta el log de cada programa al crearlo y eso bloquea el hilo
          // principal. En desarrollo se mantiene para ver los errores.
          if (import.meta.env.PROD) renderer.debug.checkShaderErrors = false
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
        <Efectos />

        {/* Último en montarse: cuando corre, la escena ya está completa. */}
        <Compilador alEstarListo={alEstarCompilado} />
        <Calentador activo={compilado} alEstarListo={alEstarListo} />
      </Canvas>

      {/* Aviso mientras la GPU compila los shaders (la página sigue viva) */}
      {!lista && (
        <p className="aviso-carga" role="status">
          <span className="aviso-carga__pulso" aria-hidden="true" />
          Preparando la escena 3D
        </p>
      )}
    </>
  )
}
