import { Environment, Lightformer } from '@react-three/drei'
import { hexAcento, useUsoTienda } from '../estado/usoTienda'

/**
 * Iluminación de estudio 100 % procedural: sin HDR externo.
 *
 * `Environment` con `Lightformer`s construye el mapa de entorno en tiempo
 * real (rect superior suave como luz principal, anillo cian y rect púrpura
 * como luces de contra) y los dos pointLight reactivos cambian con el
 * acento activo para teñir los metales.
 */
export function Iluminacion() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  return (
    <>
      <ambientLight intensity={0.35} />
      <spotLight
        position={[0.4, 4.4, 2.6]}
        angle={0.6}
        penumbra={1}
        intensity={45}
        color="#ffffff"
      />
      <pointLight color={hex} intensity={16} distance={9} position={[-2.4, 1.6, -1.4]} />
      <pointLight color="#a855f7" intensity={10} distance={9} position={[2.4, 1.1, 1.8]} />

      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={3.4}
          position={[0, 5, -1]}
          scale={[10, 5, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          color="#7dd3fc"
          intensity={1.6}
          position={[-5, 2, -1]}
          scale={4}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          color="#a855f7"
          intensity={1.3}
          position={[5, 1.5, 1]}
          scale={[4, 3, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="circle"
          color="#ffffff"
          intensity={0.8}
          position={[0, -4, 2]}
          scale={3}
          target={[0, 0, 0]}
        />
      </Environment>
    </>
  )
}
