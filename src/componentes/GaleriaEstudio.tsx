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
    src: rueda,
    alt: 'Primer plano de la rueda de goma con tacos y del botón DPI en su pozo',
    pie: 'Rueda y DPI',
    ancho: 1200,
    alto: 675,
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
]

/**
 * Fotos de estudio del ratón, en una banda: renders de Cycles del mismo
 * modelo que se ve en 3D (`modelado/render.py`), con HDRI y tela de Poly
 * Haven, materiales PBR y profundidad de campo. La principal en ocho
 * columnas (recorte casi cuadrado, el ratón lo llena) y las otras tres en
 * 16:9 a su lado; cuadradas y sin tratamiento: son el producto, con la luz
 * de su tira. WebP de 17-31 kB, con carga diferida.
 */
export function GaleriaEstudio() {
  return (
    <section className="seccion seccion--banda" aria-labelledby="titulo-estudio">
      <div className="container">
        <header className="rejilla cabecera">
          <h2 id="titulo-estudio">Cuatro ángulos, luz de estudio</h2>
          <p className="lead">
            El mismo modelo que acabas de despiezar, renderizado con luz de estudio y materiales
            físicos.
          </p>
        </header>

        <div className="rejilla bento">
          {FOTOS.map((foto, i) => (
            <figure key={foto.pie} className={`bento__foto bento__foto--${i + 1}`}>
              <img
                src={foto.src}
                alt={foto.alt}
                width={foto.ancho}
                height={foto.alto}
                loading="lazy"
                decoding="async"
                data-kind="product"
              />
              <figcaption className="etiqueta">{foto.pie}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
