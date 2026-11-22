import { ACENTOS, useUsoTienda, type Acento } from '../estado/usoTienda'

const LISTA: Acento[] = ['cyan', 'purpura', 'lima']

/**
 * Iluminación: mientras baja, ScrollDirector vuelve a montar el ratón (1→0),
 * de modo que al llegar aquí lo ves entero en la mitad derecha, y cada
 * acento repinta en vivo los LED del modelo y toda la interfaz. El selector
 * es una elección segmentada: el cuadrado elegido se rellena de tinta.
 */
export function SeccionColor() {
  const acento = useUsoTienda((s) => s.acento)
  const definir = useUsoTienda((s) => s.definirAcento)

  return (
    <section id="color" className="color">
      <div className="color__fijo">
        <div className="container rejilla">
          <div className="lado-texto color__texto">
            <h2>Cyan, púrpura o lima</h2>
            <p className="lead">
              RGB direccionable con 16,8 millones de colores. Elige un acento y mira cómo
              reacciona el ratón, y toda la página.
            </p>
            <div className="segmentos interactivo" role="group" aria-label="Color de la luz">
              {LISTA.map((id) => {
                const { nombre, hex } = ACENTOS[id]
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => definir(id)}
                    aria-pressed={id === acento}
                    aria-label={`Acento ${nombre}`}
                    className="segmento"
                  >
                    <span className="muestra" style={{ background: hex }} aria-hidden="true" />
                    {nombre}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
