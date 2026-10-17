import { useState } from 'react'
import { motion } from 'framer-motion'

const VENTAJAS = [
  '45 g con panal de refuerzo interno',
  '8 000 Hz inalámbrico · 0.125 ms',
  '90 h de batería · carga rápida USB-C',
  'Envío gratis en 48 h (demo)',
]

/**
 * Bloque de compra. El fondo es un degradado que se abre a la izquierda en
 * escritorio: el ratón montado sigue ahí, girando, como escaparate real.
 */
export function SeccionCompra() {
  const [anadido, setAnadido] = useState(false)

  const anadir = () => {
    setAnadido(true)
    window.setTimeout(() => setAnadido(false), 2200)
  }

  return (
    <section
      id="comprar"
      className="relative flex min-h-[100svh] items-center bg-gradient-to-b from-[rgba(5,6,10,0.75)] via-[rgba(5,6,10,0.94)] to-[#05060a] lg:bg-gradient-to-r lg:from-[rgba(5,6,10,0.35)] lg:via-[rgba(5,6,10,0.85)] lg:to-[#05060a]"
    >
      <div className="mx-auto grid w-[min(1120px,90vw)] items-center gap-10 py-24 lg:grid-cols-2">
        {/* Columna vacía en escritorio: aquí se ve el ratón 3D */}
        <div className="hidden lg:block" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="cristal rounded-3xl p-7 sm:p-8"
        >
          <p className="etiqueta-seccion">05 · Reserva</p>
          <h2 className="titulo-grande mt-3 text-3xl text-white">VOLTA X1</h2>
          <p className="texto-apagado mt-1 text-sm">Edición Fundador · unidades numeradas del 0001 al 5000</p>

          <p className="mt-6 flex items-end gap-3">
            <span className="titulo-grande texto-acento texto-glow text-5xl">149 €</span>
            <span className="texto-apagado pb-1 text-lg line-through">189 €</span>
          </p>

          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            {VENTAJAS.map((ventaja) => (
              <li key={ventaja} className="flex gap-2">
                <span className="texto-acento">▸</span>
                {ventaja}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={anadir} className="boton-neon">
              {anadido ? '✓ Añadido (demo)' : 'Añadir al carrito'}
            </button>
            <a href="#inicio" className="boton-fantasma">
              Volver arriba
            </a>
          </div>

          <p className="texto-apagado mt-4 text-xs">
            Demo conceptual de portfolio: no existe un pago real.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
