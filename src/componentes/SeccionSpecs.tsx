import { ESPECIFICACIONES } from '../datos/especificaciones'
import { GaleriaEstudio } from './GaleriaEstudio'

/**
 * Ficha técnica en filas sobre el fondo, con hairlines: la cifra en el corte
 * ancho y ligero de los titulares, el nombre y su efecto en la alfombrilla.
 * Fondo opaco: el despiece fijo queda tapado hasta que Iluminación lo monta.
 * Debajo, en una banda, los renders de estudio.
 */
export function SeccionSpecs() {
  return (
    <>
      <section id="specs" className="seccion">
        <div className="container">
          <header className="rejilla cabecera">
            <h2>Seis cifras en 45 gramos</h2>
            <p className="lead">
              Cada cifra de esta tabla se traduce en una ventaja medible sobre la alfombrilla.
            </p>
          </header>

          <ul className="filas">
            {ESPECIFICACIONES.map((spec) => (
              <li key={spec.titulo} className="rejilla fila">
                <p className="fig fila__fig">
                  {spec.valor}
                  <span className="fig__unidad">{spec.unidad}</span>
                </p>
                <h3 className="fila__titulo">{spec.titulo}</h3>
                <p className="fila__texto">{spec.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <GaleriaEstudio />
    </>
  )
}
