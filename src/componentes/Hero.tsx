import { motion } from 'framer-motion'
import { useUsoTienda } from '../estado/usoTienda'
import { GiroFoto } from './GiroFoto'

/** Un único asentamiento: el texto pasa de 0,6 a 1 de opacidad, una vez. */
const asentar = {
  initial: { opacity: 0.6 },
  animate: { opacity: 1 },
  transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
}

/**
 * Héroe en banda: el nombre, una frase y las dos acciones; justo debajo, el
 * ratón renderizado en Cycles girando 360° (se arrastra), grande y de cerca.
 * El 3D en vivo se oculta mientras este giro está a la vista y toma el relevo
 * al bajar a Tecnología, donde se descompone.
 */
export function Hero() {
  const reducido = useUsoTienda((s) => s.reducido)

  const irA = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' })
  }

  return (
    <section id="inicio" className="heroe">
      <div className="container">
        <div className="rejilla heroe__cabecera">
          <motion.h1 className="heroe__titulo" {...asentar}>
            VOLTA X1
          </motion.h1>
          <motion.div className="heroe__texto" {...asentar}>
            <p className="lead">
              El ratón inalámbrico de 45 gramos que se desmonta ante tus ojos.
            </p>
            <div className="acciones">
              <button
                type="button"
                onClick={() => irA('comprar')}
                className="boton boton--primario"
              >
                Comprar por 149&nbsp;€
              </button>
              <button
                type="button"
                onClick={() => irA('tecnologia')}
                className="boton boton--secundario"
              >
                Ver la tecnología interna
              </button>
            </div>
          </motion.div>
        </div>

        {/* El ratón de cerca: giro fotográfico de Cycles */}
        <figure className="giro">
          <GiroFoto />
          <figcaption className="giro__pie etiqueta">
            Arrástralo para girarlo; desliza hacia abajo para descomponerlo.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
