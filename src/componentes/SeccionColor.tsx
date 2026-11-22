/**
 * Iluminación: mientras baja, ScrollDirector vuelve a montar el despiece
 * (1→0) y, ya montado, el ratón gira en la mitad derecha con la onda RGB
 * recorriendo la tira. Sin selector: la luz es multicolor.
 */
export function SeccionColor() {
  return (
    <section id="color" className="color">
      <div className="color__fijo">
        <div className="container rejilla">
          <div className="lado-texto color__texto">
            <h2>16,8 millones de colores</h2>
            <p className="lead">
              RGB direccionable en la tira, el logo y la placa, sincronizado con tu setup por
              software.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
