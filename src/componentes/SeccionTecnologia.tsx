import { ControlExplosion } from './ControlExplosion'

/**
 * Sección larga (280 vh) que acompaña a la descomposición.
 *
 * Composición asimétrica: el texto se queda a la izquierda y los controles
 * abajo a la derecha, dejando libre la banda central donde vive el ratón
 * del lienzo fijo con sus hotspots. El scroll de esta sección mapea 0→1 en
 * `ScrollDirector`.
 */
export function SeccionTecnologia() {
  return (
    <section id="tecnologia" className="relative h-[280vh]">
      <div className="pointer-events-none sticky top-0 h-[100svh]">
        <header className="absolute left-5 right-5 top-24 max-w-sm text-left sm:left-12">
          <p className="etiqueta-seccion">02 · Ingeniería</p>
          <h2 className="titulo-grande mt-3 text-[clamp(1.5rem,3vw,2.3rem)] leading-tight text-white">
            Diseccionado hasta el <span className="texto-acento">último átomo</span>
          </h2>
          <p className="texto-apagado mt-3 text-sm">
            Desliza para separar las seis capas. Cada punto es una pieza real: pásale
            el ratón por encima para leer sus números.
          </p>
        </header>

        <div className="absolute bottom-6 left-5 right-5 sm:left-auto sm:right-8 sm:w-[420px]">
          <ControlExplosion />
        </div>
      </div>
    </section>
  )
}
