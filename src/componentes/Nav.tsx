import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion'

const ENLACES = [
  { href: '#tecnologia', texto: 'Tecnología' },
  { href: '#specs', texto: 'Specs' },
  { href: '#color', texto: 'Iluminación' },
]

/**
 * Barra superior fija y cuadrada (Midnight): la marca, las tres secciones y
 * la compra, que así queda a mano en todo el recorrido. Debajo, el medidor
 * de scroll en el acento activo: la única línea que se mueve.
 */
export function Nav() {
  const { scrollYProgress } = useScroll()
  const reducido = useReducedMotion()
  const muelle = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 })
  // La barra es información de progreso: sin muelle sigue siendo útil, pero
  // deja de moverse por su cuenta cuando el sistema pide menos movimiento.
  const barra = reducido ? scrollYProgress : muelle

  return (
    <header className="nav">
      <div className="container">
        <div className="nav__barra">
          <a href="#inicio" className="nav__marca interactivo" aria-label="VOLTA, inicio">
            <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true">
              <path
                d="M14 16 L32 48 L50 16"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="8"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            </svg>
            <span className="nav__palabra">VOLTA</span>
          </a>

          <nav className="nav__enlaces" aria-label="Secciones">
            {ENLACES.map((enlace) => (
              <a key={enlace.href} href={enlace.href} className="nav__enlace">
                {enlace.texto}
              </a>
            ))}
          </nav>

          <a href="#comprar" className="boton boton--secundario">
            Comprar
          </a>
        </div>
        <div className="nav__medidor" aria-hidden="true">
          <motion.span style={{ scaleX: barra }} />
        </div>
      </div>
    </header>
  )
}
