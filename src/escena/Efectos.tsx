import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

/**
 * Postprocesado minimalista y barato:
 * - Bloom con mipmapBlur: hace florecer los LEDs, el logo y los hotspots.
 *   Umbral alto (0.58) para que solo brillen las superficies emissive.
 * - La viñeta que antes era un pase más del postprocesado ahora es una capa
 *   CSS (`.vineta` en `index.css`): mismo efecto por 0 € de GPU, porque es
 *   estática y el compositor la pinta gratis.
 * - multisampling 0: el postprocesado renderiza a sus propios targets.
 * - Tonemapping AgX al final, el mismo de los renders de Cycles: sin él la
 *   salida del compositor iba lineal, los brillos se recortaban en blanco y
 *   el soft-touch negro se leía gris.
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
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  )
}
