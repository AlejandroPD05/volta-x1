import { Bloom, EffectComposer } from '@react-three/postprocessing'

/**
 * Postprocesado minimalista y barato:
 * - Bloom con mipmapBlur: hace florecer los LEDs, el logo y los hotspots.
 *   Umbral alto (0.58) para que solo brillen las superficies emissive.
 * - La viñeta que antes era un pase más del postprocesado ahora es una capa
 *   CSS (`.vineta` en `index.css`): mismo efecto por 0 € de GPU, porque es
 *   estática y el compositor la pinta gratis.
 * - multisampling 0: el postprocesado renderiza a sus propios targets.
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
    </EffectComposer>
  )
}
