import { motion } from 'framer-motion'
import heroe from '../assets/estudio/heroe.webp'
import lateral from '../assets/estudio/lateral.webp'
import trasera from '../assets/estudio/trasera.webp'
import rueda from '../assets/estudio/rueda.webp'

type Foto = { src: string; alt: string; pie: string; ancho: number; alto: number }

const FOTOS: Foto[] = [
  {
    src: heroe,
    alt: 'VOLTA X1 en tres cuartos sobre una alfombrilla negra, con la tira de luz cian encendida',
    pie: 'Tres cuartos',
    ancho: 1600,
    alto: 900,
  },
  {
    src: lateral,
    alt: 'Perfil izquierdo del VOLTA X1 con sus dos botones laterales bajo la tira de luz',
    pie: 'Perfil',
    ancho: 1200,
    alto: 675,
  },
  {
    src: trasera,
    alt: 'Grupa del VOLTA X1 con el logotipo en V retroiluminado',
    pie: 'Grupa y logo',
    ancho: 1200,
    alto: 675,
  },
  {
    src: rueda,
    alt: 'Primer plano de la rueda de goma con tacos y del botón DPI en su pozo',
    pie: 'Rueda y DPI',
    ancho: 1200,
    alto: 675,
  },
]

/**
 * Fotos de estudio del ratón. Son renders de Cycles del mismo modelo que se
 * ve en 3D (`modelado/render.py`): HDRI y tela de Poly Haven, materiales PBR
 * y profundidad de campo. WebP de 17-31 kB, con carga diferida.
 */
export function GaleriaEstudio() {
  return (
    <div className="mt-20">
      <header className="text-center">
        <h3 className="titulo-grande text-[clamp(1.4rem,3.2vw,2.2rem)] text-white">
          En el <span className="texto-acento">estudio</span>
        </h3>
        <p className="texto-apagado mx-auto mt-3 max-w-md text-sm sm:text-base">
          El mismo modelo que acabas de despiezar, renderizado con luz de estudio y
          materiales físicos.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {FOTOS.map((foto, i) => (
          <motion.figure
            key={foto.pie}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={`cristal overflow-hidden rounded-2xl ${i === 0 ? 'sm:col-span-3' : ''}`}
          >
            <img
              src={foto.src}
              alt={foto.alt}
              width={foto.ancho}
              height={foto.alto}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
            <figcaption className="texto-apagado px-4 py-3 text-xs tracking-wide">
              {foto.pie}
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  )
}
