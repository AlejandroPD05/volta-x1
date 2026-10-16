import { motion, useScroll, useSpring } from 'framer-motion'

const ENLACES = [
  { href: '#tecnologia', texto: 'Tecnología' },
  { href: '#specs', texto: 'Specs' },
  { href: '#color', texto: 'Iluminación' },
]

/** Barra superior fija con barra de progreso de scroll en el acento activo. */
export function Nav() {
  const { scrollYProgress } = useScroll()
  const barra = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 })

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="cristal mx-auto flex w-[min(1120px,92vw)] items-center justify-between gap-4 rounded-2xl px-4 py-3 sm:px-6">
        <a href="#inicio" className="interactivo flex items-center gap-2" aria-label="VOLTA — inicio">
          <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
            <path
              d="M14 16 L32 48 L50 16"
              fill="none"
              stroke="var(--acento)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="titulo-grande text-sm tracking-[0.3em] text-white">VOLTA</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Secciones">
          {ENLACES.map((enlace) => (
            <a
              key={enlace.href}
              href={enlace.href}
              className="texto-apagado text-sm transition-colors hover:text-white"
            >
              {enlace.texto}
            </a>
          ))}
        </nav>

        <a
          href="#comprar"
          className="rounded-full bg-[var(--acento)] px-4 py-2 text-xs font-bold text-[#04060a] shadow-[0_0_18px_-4px_var(--acento)] transition-transform hover:-translate-y-0.5"
        >
          Comprar · 149 €
        </a>
      </div>

      <motion.div
        style={{ scaleX: barra }}
        className="mx-auto mt-1 h-px w-[min(1120px,92vw)] origin-left bg-[var(--acento)]"
      />
    </header>
  )
}
