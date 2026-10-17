import { Color, Matrix4 } from 'three'
import type { MeshStandardMaterial, WebGLProgramParametersWithUniforms } from 'three'
import { escalonSuave } from '../utiles/mates'
import { COLA_Z, NARIZ_Z } from './partes/geometriaRaton'

/**
 * «Sobrecarga» de acento: la corriente de luz que recorre el ratón de la
 * nariz a la cola cuando cambia el color.
 *
 * Los uniformes son únicos y compartidos por todos los materiales emisivos
 * parcheados con `parchearOnda`: mover `frente` retiñe toda la iluminación en
 * bloque, como si la corriente entrara por la nariz y saliera por la cola.
 * Vive fuera de React (mismo patrón que `sim`): el shader lo lee cada frame.
 */
export const onda = {
  /** Matriz mundo→local del ratón (la refresca `Raton.tsx` cada frame). */
  invRaton: { value: new Matrix4() },
  /** z local del frente de la sobrecarga. */
  frente: { value: 2 },
  /** Media anchura de la transición, en unidades del ratón. */
  ancho: { value: 0.13 },
  /** 0 = reposo; 1 = sobrecarga en curso. */
  activo: { value: 0 },
  /** Color saliente (por delante del frente aún no ha llegado el nuevo). */
  desde: { value: new Color('#00e5ff') },
  /** Color entrante. */
  hasta: { value: new Color('#00e5ff') },
}

/** Duración del barrido, en segundos. */
const DURACION = 1.2
/** El frente nace por delante de la nariz y muere por detrás de la cola. */
const FRENTE_INICIO = NARIZ_Z + 0.35
const FRENTE_FIN = COLA_Z - 0.35
let progreso = 1

/** Dispara la sobrecarga del color `desde` al color `hasta`. */
export function lanzarOnda(desde: string, hasta: string): void {
  onda.desde.value.set(desde)
  onda.hasta.value.set(hasta)
  onda.frente.value = FRENTE_INICIO
  onda.activo.value = 1
  progreso = 0
}

/** Avanza el frente. La llama el componente `Onda` en cada frame. */
export function avanzarOnda(delta: number): void {
  if (onda.activo.value === 0) return
  progreso = Math.min(1, progreso + delta / DURACION)
  onda.frente.value = FRENTE_INICIO + (FRENTE_FIN - FRENTE_INICIO) * escalonSuave(progreso)
  if (progreso >= 1) onda.activo.value = 0
}

/** Clave de caché: todos los materiales con sobrecarga comparten programa. */
export function claveOnda(): string {
  return 'voltOnda'
}

/**
 * Inyecta la sobrecarga en un material estándar emisivo.
 *
 * Se asigna a `material.onBeforeCompile` (o se pasa como la prop homónima de
 * un material JSX): three lo invoca con `this` = material, de ahí que se lea
 * `emissiveIntensity` para replicar el brillo base de cada pieza.
 *
 * En el vértice se guarda la posición en coordenadas del ratón; en el
 * fragmento, el emisivo se mezcla entre `desde` y `hasta` según pase el
 * frente, con una cresta blanca en el borde que hace florecer el bloom.
 */
export function aplicarOnda(
  this: MeshStandardMaterial,
  shader: WebGLProgramParametersWithUniforms,
): void {
  shader.uniforms.uOndaInvRaton = onda.invRaton
  shader.uniforms.uOndaFrente = onda.frente
  shader.uniforms.uOndaAncho = onda.ancho
  shader.uniforms.uOndaActivo = onda.activo
  shader.uniforms.uOndaDesde = onda.desde
  shader.uniforms.uOndaHasta = onda.hasta
  shader.uniforms.uOndaBrillo = { value: this.emissiveIntensity }

  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      ['#include <common>', 'uniform mat4 uOndaInvRaton;', 'varying vec3 vOndaPos;'].join('\n'),
    )
    .replace(
      '#include <begin_vertex>',
      [
        '#include <begin_vertex>',
        'vOndaPos = (uOndaInvRaton * modelMatrix * vec4(transformed, 1.0)).xyz;',
      ].join('\n'),
    )

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      [
        '#include <common>',
        'uniform float uOndaFrente;',
        'uniform float uOndaAncho;',
        'uniform float uOndaActivo;',
        'uniform float uOndaBrillo;',
        'uniform vec3 uOndaDesde;',
        'uniform vec3 uOndaHasta;',
        'varying vec3 vOndaPos;',
      ].join('\n'),
    )
    .replace(
      '#include <emissivemap_fragment>',
      [
        '#include <emissivemap_fragment>',
        '{',
        '  float ondaAvance = smoothstep(uOndaFrente - uOndaAncho, uOndaFrente + uOndaAncho, vOndaPos.z);',
        '  vec3 ondaColor = mix(uOndaDesde, uOndaHasta, ondaAvance) * uOndaBrillo;',
        '  totalEmissiveRadiance = mix(totalEmissiveRadiance, ondaColor, uOndaActivo);',
        '  float ondaDist = (vOndaPos.z - uOndaFrente) * 6.0;',
        '  float ondaCresta = exp(-ondaDist * ondaDist);',
        '  totalEmissiveRadiance += (vec3(0.75) + uOndaHasta * 0.55) * ondaCresta * uOndaActivo * 1.5;',
        '}',
      ].join('\n'),
    )
}

/** Deja un material listo para la sobrecarga (parche + caché de programa). */
export function parchearOnda<T extends MeshStandardMaterial>(material: T): T {
  material.onBeforeCompile = aplicarOnda
  material.customProgramCacheKey = claveOnda
  return material
}
