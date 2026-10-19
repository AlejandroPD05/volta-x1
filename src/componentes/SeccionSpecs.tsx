import { motion } from 'framer-motion'
import { ESPECIFICACIONES } from '../datos/especificaciones'

/**
 * Rejilla de especificaciones. Fondo casi opaco con blur: el ratón
 * descompuesto sigue intuíyéndose detrás, lo que da continuidad entre
 * secciones sin distraer de las cifras.
 */
export function SeccionSpecs() {
  return (
    <section id="specs" className="relative bg-[rgba(5,6,10,0.93)] py-24 sm:py-32">
      <div className="mx-auto w-[min(1120px,90vw)]">
        <header className="text-center">
          <p className="etiqueta-seccion">03 · Ficha técnica</p>
          <h2 className="titulo-grande mt-3 text-[clamp(1.8rem,4.5vw,3.2rem)] text-white">
            Números que <span className="texto-acento">se sienten</span>
          </h2>
          <p className="texto-apagado mx-auto mt-3 max-w-md text-sm sm:text-base">
            Cada cifra de esta tabla se traduce en una ventaja medible sobre la
            alfombrilla.
          </p>
        </header>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ESPECIFICACIONES.map((spec, i) => (
            <motion.article
              key={spec.titulo}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="cristal tarjeta-spec rounded-2xl p-6"
            >
              <p className="titulo-grande text-4xl text-white">
                {spec.valor}
                <span className="texto-acento ml-1 text-lg">{spec.unidad}</span>
              </p>
              <h3 className="mt-3 font-semibold text-white">{spec.titulo}</h3>
              <p className="texto-apagado mt-2 text-sm leading-relaxed">{spec.texto}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
