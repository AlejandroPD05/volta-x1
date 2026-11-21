/**
 * Cotas maestras del ratón en unidades de la escena.
 *
 * La forma (basada en el HyperX Pulsefire Surge: 120 × 63 × 41 mm) se
 * modela en Blender con `modelado/surge.py` y llega como GLB
 * (`modeloRaton.ts`). Aquí solo quedan las cotas que usan el código y los
 * shaders, con la misma escala que el script: 1,164 u = 120 mm.
 *
 * Convención: z+ = nariz, z- = cola, y = altura desde el suelo, x+ = flanco
 * izquierdo (el de los botones laterales).
 */

/** Unidades de escena por milímetro. */
export const MM = 1.164 / 120

export const NARIZ_Z = 0.622
export const COLA_Z = -0.542

/** Rueda: Ø 20 mm, 6,8 mm de ancho, eje a 18,5 mm de la nariz y 19 mm de altura. */
export const RUEDA_RADIO = 10 * MM
export const RUEDA_ANCHO = 6.8 * MM
