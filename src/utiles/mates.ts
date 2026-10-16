/** Utilidades matemáticas puras compartidas por la escena 3D y la interfaz. */

export function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

/** Interpolación lineal. */
export function mezclar(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Suavizado exponencial independiente del framerate (estilo THREE.MathUtils.damp). */
export function esponjar(valor: number, objetivo: number, velocidad: number, delta: number): number {
  const paso = Math.min(delta, 0.05)
  return objetivo + (valor - objetivo) * Math.exp(-velocidad * paso)
}

/** Curva con extremos suaves (smoothstep). */
export function escalonSuave(t: number): number {
  const v = acotar(t, 0, 1)
  return v * v * (3 - 2 * v)
}

/** Curva de salida rápida (ease-out cúbica), usada por la cámara de intro. */
export function facil(t: number): number {
  const v = acotar(t, 0, 1)
  return 1 - Math.pow(1 - v, 3)
}

/**
 * Progreso 0..1 de una capa con retardo dentro de la explosión global.
 * Un `retardo` de 0.4 significa "esta capa arranca cuando la explosión
 * global lleva un 40 % y termina cuando llega al 100 %".
 */
export function progresoPorRetardo(explosion: number, retardo: number): number {
  return acotar((explosion - retardo) / (1 - retardo), 0, 1)
}
