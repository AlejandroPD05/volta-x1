import { motion } from 'framer-motion'
import { useUsoTienda } from '../estado/usoTienda'

const CHIPS = ['45 g ultraligero', '8 000 Hz sin cables', '30 000 DPI', '90 h de batería']

const contenedor = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.7 } },
}

const item = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
}

/**
 * Héroe: deja el centro libre para el ratón 3D (el lienzo es fijo y está
 * detrás). El texto entra escalonado después de que la cámara "aterrice".
 */
export function Hero() {
  const reducido = useUsoTienda((s) => s.reducido)

  const irA = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' })
  }

  return (
    <section
      id="inicio"
      className="relative flex h-[100svh] flex-col items-center justify-between overflow-hidden pb-10 pt-24 sm:pb-14"
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={contenedor}
        className="flex flex-col items-center px-6 text-center"
      >
        <motion.p
          variants={item}
          className="cristal rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] texto-acento"
        >
          Nuevo · Edición Fundador
        </motion.p>

        <motion.h1
          variants={item}
          className="titulo-grande mt-5 text-[clamp(3.2rem,11vw,7.5rem)] leading-none text-white"
        >
          VOLTA <span className="texto-acento texto-glow">X1</span>
        </motion.h1>

        <motion.p variants={item} className="texto-apagado mt-4 max-w-md text-sm sm:text-base">
          El ratón inalámbrico de 45 gramos que se desmonta delante de tus ojos.
          Arrástralo, gíralo y mira lo que llevamos dentro.
        </motion.p>
      </motion.div>

      {/* El centro queda limpio: ahí vive el modelo 3D */}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={contenedor}
        className="flex flex-col items-center gap-5 px-6"
      >
        <motion.ul variants={item} className="flex flex-wrap justify-center gap-2">
          {CHIPS.map((chip) => (
            <li
              key={chip}
              className="cristal rounded-full px-3.5 py-1.5 font-mono text-[11px] text-slate-300"
            >
              {chip}
            </li>
          ))}
        </motion.ul>

        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => irA('tecnologia')} className="boton-neon">
            Ver la tecnología interna
          </button>
          <button type="button" onClick={() => irA('comprar')} className="boton-fantasma">
            Comprar — 149 €
          </button>
        </motion.div>

        <motion.p variants={item} className="texto-apagado font-mono text-[10px] uppercase tracking-[0.25em]">
          Arrastra para girar · desliza para descomponer
        </motion.p>
      </motion.div>
    </section>
  )
}
