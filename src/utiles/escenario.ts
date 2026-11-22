/**
 * Dónde vive el escenario fijo (las fotos de Cycles y el ratón 3D).
 *
 * La página es un díptico: el texto ocupa las columnas 1 a 5 de la rejilla
 * y el escenario, la mitad derecha. Con 60rem o más, el centro del escenario
 * es el de las columnas 6 a 12 del contenedor (mismos valores que
 * `tokens.css`: 1440 px de contenedor, 64 px de margen y 32 px entre
 * columnas); por debajo, el centro de la ventana.
 */
const CONTENEDOR = 1440
const MARGEN = 64
const HUECO = 32
const ESCRITORIO = 960

export function centroEscenario(anchoVentana: number): number {
  if (anchoVentana < ESCRITORIO) return anchoVentana / 2
  const contenedor = Math.min(anchoVentana, CONTENEDOR)
  const izquierda = (anchoVentana - contenedor) / 2 + MARGEN
  const columna = (contenedor - 2 * MARGEN - 11 * HUECO) / 12
  return izquierda + 5 * (columna + HUECO) + (7 * columna + 6 * HUECO) / 2
}
