import { Environment, Lightformer } from '@react-three/drei'
import { hexAcento, useUsoTienda } from '../estado/usoTienda'
import urlEstudio from './modelos/estudio.hdr?url'

/**
 * Iluminación de estudio.
 *
 * La base del mapa de entorno es un estudio fotográfico real: el HDRI
 * `studio_small_09` de Poly Haven (CC0), el mismo de los renders de Cycles,
 * reducido a 512 × 256 (400 kB: para un PMREM de 256 px no hace falta más).
 * Sus softboxes dan al soft-touch y al piano black reflejos de producto de
 * verdad. Encima, los `Lightformer`s añaden los acentos de neón de la marca
 * (anillo cian y rect púrpura de contra) y los dos pointLight reactivos
 * cambian con el acento activo para teñir los metales.
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

      <Environment
        files={urlEstudio}
        resolution={256}
        frames={1}
        environmentIntensity={0.6}
        environmentRotation={[0, Math.PI * 0.6, 0]}
      >
        <Lightformer
          form="rect"
          intensity={1.6}
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
