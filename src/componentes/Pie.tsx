/** Pie de página: bloque de colofón, la letra pequeña honesta. */
export function Pie() {
  return (
    <footer className="pie">
      <div className="container">
        <div className="pie__bloque">
          <p className="pie__palabra">VOLTA</p>
          <p className="apagado">
            © 2026 VOLTA, marca ficticia creada para la demo de portfolio de{' '}
            <a href="https://alejandropd05.github.io/portfolio/" target="_blank" rel="noreferrer">
              Alejandro Prieto Díez
            </a>
            . Hecho con React Three Fiber, GSAP y Tailwind.
          </p>
        </div>
      </div>
    </footer>
  )
}
