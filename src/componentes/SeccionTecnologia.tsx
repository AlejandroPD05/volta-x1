import { HOTSPOTS } from '../datos/especificaciones'
import { ControlExplosion } from './ControlExplosion'

/** Las capas que cuentan el despiece, en el orden en que se separan. */
const PASOS = ['carcasa', 'pcb', 'bateria'].map((id) => HOTSPOTS.find((h) => h.id === id)!)

/**
 * Sección larga (380 svh) que acompaña a la descomposición: el ratón se abre
 * en los primeros 240 svh y se queda abierto (y girable) una pantalla más.
 *
 * Recorrido fijado: el despiece fotográfico se queda en la mitad derecha
 * mientras los paneles de la izquierda pasan a su lado, cada uno con la capa
 * que se está separando. El control del despiece se queda abajo, a mano.
 */
export function SeccionTecnologia() {
  return (
    <section id="tecnologia" className="tecnologia">
      <div className="tecnologia__fijo">
        <div className="container">
          <div className="tecnologia__control interactivo">
            <ControlExplosion />
          </div>
        </div>
      </div>

      <div className="container rejilla">
        <div className="lado-texto">
          <div className="tecnologia__panel">
            <div className="tecnologia__pozo">
              <h2>Las seis capas</h2>
              <p className="lead">
                Desliza para separar las seis capas. Cada punto es una pieza real: pásale el
                ratón por encima para leer sus números.
              </p>
            </div>
          </div>

          {PASOS.map((paso) => (
            <div key={paso.id} className="tecnologia__panel">
              <div className="tecnologia__pozo">
                <h3>{paso.titulo}</h3>
                <p className="fig tecnologia__dato">{paso.dato}</p>
                <p className="lead">{paso.resumen}</p>
              </div>
            </div>
          ))}

          <div className="tecnologia__panel">
            <div className="tecnologia__pozo">
              <p className="lead">
                Abierto del todo, arrástralo o usa las flechas para girarlo 360°.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
