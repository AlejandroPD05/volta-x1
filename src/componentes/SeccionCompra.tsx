import { useState } from 'react'

const VENTAJAS = [
  '45 g con panal de refuerzo interno',
  '8 000 Hz inalámbrico, latencia de 0,125 ms',
  '90 h de batería, carga rápida USB-C',
  'Envío gratis en 48 h (demo)',
]

/**
 * La oferta, en la mitad izquierda: el ratón montado sigue a la derecha,
 * girando, como escaparate real. El precio va en el corte ancho y ligero de
 * los titulares, como una cartela. Es una demo de portfolio: el botón no
 * añade nada a ningún carrito y lo dice, en vez de fingir que lo ha hecho.
 */
export function SeccionCompra() {
  const [avisado, setAvisado] = useState(false)

  const anadir = () => {
    setAvisado(true)
    window.setTimeout(() => setAvisado(false), 2200)
  }

  return (
    <section id="comprar" className="oferta">
      <div className="container rejilla">
        <div className="lado-texto oferta__caja">
          <div>
            <h2>VOLTA X1</h2>
            <p className="apagado">Edición Fundador, unidades numeradas del 0001 al 5000</p>
          </div>

          <p className="oferta__precio">
            <span className="fig oferta__cifra">149&nbsp;€</span>
            <span className="oferta__antes">189&nbsp;€</span>
          </p>

          <ul className="oferta__lista">
            {VENTAJAS.map((ventaja) => (
              <li key={ventaja}>{ventaja}</li>
            ))}
          </ul>

          <div className="acciones">
            <button type="button" onClick={anadir} className="boton boton--primario">
              {avisado ? 'Es una demo: no hay carrito' : 'Añadir al carrito'}
            </button>
            <a href="#inicio" className="boton boton--secundario">
              Volver arriba
            </a>
          </div>

          <p className="etiqueta" role="status">
            Demo conceptual de portfolio: no existe un pago real.
          </p>
        </div>
      </div>
    </section>
  )
}
