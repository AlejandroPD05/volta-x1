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

// Puente de depuración: permite inspeccionar la simulación desde la consola
// o desde las pruebas con navegador. Solo existe en desarrollo y con DOM
// disponible (los tests unitarios corren en node, sin `window`).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__voltaSim = sim
}
