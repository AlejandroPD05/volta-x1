import { useLoader } from '@react-three/fiber'
import { NoColorSpace, type Texture, TextureLoader } from 'three'

/**
 * Mapas horneados en Blender (Cycles) del modelo denso al ligero de la web
 * (`modelado/surge.py`, `hornear_mapas`):
 * - `normal`: relieve de la malla densa en espacio tangente (sin las facetas
 *   del diezmado, con los biseles de molde),
 * - `mat`: R = oclusión ambiental, G = luz difusa que la tira RGB proyecta
 *   sobre el propio ratón (se tiñe con el acento en el shader).
 * WebP de 1024 px (carcasas) y 256 px (piezas pequeñas): 224 kB en total.
 */
const URLS = import.meta.glob<string>('../modelos/horneado/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
})

export const PIEZAS_HORNEADAS = [
  'CarcasaSuperior',
  'CarcasaInferior',
  'BotonLateralDelantero',
  'BotonLateralTrasero',
  'BotonDPI',
  'Bandeja',
] as const

export type PiezaHorneada = (typeof PIEZAS_HORNEADAS)[number]
export type MapasPieza = { normal: Texture; mat: Texture }

const LISTA = PIEZAS_HORNEADAS.flatMap((pieza) => [
  URLS[`../modelos/horneado/${pieza}_normal.webp`],
  URLS[`../modelos/horneado/${pieza}_mat.webp`],
])

/** Cargador que deja cada mapa listo al llegar (datos, no color; UV de glTF). */
class CargadorMapas extends TextureLoader {
  override load(
    url: string,
    alCargar?: (textura: Texture<HTMLImageElement>) => void,
    alProgresar?: (evento: ProgressEvent) => void,
    alFallar?: (error: unknown) => void,
  ): Texture<HTMLImageElement> {
    return super.load(
      url,
      (textura) => {
        // UV de glTF: origen arriba a la izquierda, sin volteo.
        textura.flipY = false
        textura.colorSpace = NoColorSpace
        textura.anisotropy = 4
        alCargar?.(textura)
      },
      alProgresar,
      alFallar,
    )
  }
}

const preparados = new WeakMap<object, Record<PiezaHorneada, MapasPieza>>()

export function useMapasHorneados(): Record<PiezaHorneada, MapasPieza> {
  const texturas = useLoader(CargadorMapas, LISTA)
  let mapas = preparados.get(texturas)
  if (!mapas) {
    mapas = {} as Record<PiezaHorneada, MapasPieza>
    PIEZAS_HORNEADAS.forEach((pieza, i) => {
      mapas![pieza] = { normal: texturas[i * 2], mat: texturas[i * 2 + 1] }
    })
    preparados.set(texturas, mapas)
  }
  return mapas
}

useLoader.preload(CargadorMapas, LISTA)
