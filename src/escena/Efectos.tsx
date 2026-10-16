import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'

/**
 * Postprocesado minimalista y barato:
 * - Bloom con mipmapBlur: hace florecer los LEDs, el logo y los hotspots.
 *   Umbral alto (0.5) para que solo brillen las superficies emissive.
 * - Vignette: oscurece las esquinas y centra la mirada en el producto.
 * multisampling 0 porque el antialias del canvas ya está activo (ahorra GPU).
 */
export function Efectos() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={1}
        luminanceThreshold={0.58}
        luminanceSmoothing={0.16}
        radius={0.7}
      />
      <Vignette eskil={false} offset={0.18} darkness={0.82} />
    </EffectComposer>
  )
}
