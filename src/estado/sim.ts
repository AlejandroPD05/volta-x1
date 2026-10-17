/**
 * Valores continuos de la simulación 3D.
 *
 * Viven fuera de Zustand a propósito: el bucle de render los lee y los
 * escribe decenas de veces por segundo y no deben provocar re-renders de
 * React. La interfaz solo toca `usoTienda` (objetivos); la escena suaviza
 * aquí y cada pieza del ratón lee estos valores en su propio `useFrame`.
 */
export const sim = {
  /** Explosión suavizada (0 = ratón montado, 1 = descompuesto del todo). */
  explosion: 0,
  /** Progreso de la intro de entrada (0 = recién cargado, 1 = terminada). */
  intro: 0,
}

/** Posición de pantalla de un marcador de hotspot (la escribe la escena). */
export type RanuraMarcador = { x: number; y: number; z: number }

/**
 * Ranuras estables (una por hotspot) con su posición proyectada en píxeles.
 *
 * Los anclajes 3D las escriben en cada frame y la capa DOM de marcadores las
 * lee para aplicar estilos. Mismo principio que `sim`: valores continuos
 * fuera de React, sin re-renders.
 */
export const marcadores = new Map<string, RanuraMarcador>()

/** Devuelve (creando si hace falta) la ranura estable de un marcador. */
export function ranuraMarcador(id: string): RanuraMarcador {
  let ranura = marcadores.get(id)
  if (!ranura) {
    ranura = { x: 0, y: 0, z: 0 }
    marcadores.set(id, ranura)
  }
  return ranura
}

// Puente de depuración: permite inspeccionar la simulación desde la consola
// o desde las pruebas con navegador. Solo existe en desarrollo y con DOM
// disponible (los tests unitarios corren en node, sin `window`).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__voltaSim = sim
}
