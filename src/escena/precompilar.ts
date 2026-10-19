import type { Camera, Material, Object3D, Scene, WebGLRenderer } from 'three'

/**
 * Precompila los shaders de la escena sin congelar la página.
 *
 * El problema, medido con perfilador: la escena estrena 168 materiales (cada
 * `<meshStandardMaterial>` del JSX es una instancia) y cada combinación de
 * mapas/caras obliga al driver a compilar un programa nuevo (~150 ms cada uno
 * en Windows/ANGLE). Además, cada consulta síncrona a la GPU (estado del
 * enlace, lista de uniformes) espera a que el driver termine lo que tenga
 * entre manos, así que preguntar con la cola llena bloquea el hilo principal.
 *
 * `renderer.compile()` hace dos cosas caras a la vez: el trabajo de JavaScript
 * por material (parámetros, clave de caché y clonado de la tabla de uniformes,
 * ~700 ms con 168 materiales) y la emisión de los enlaces. `compileAsync()`
 * lo empeora consultando el estado en bucle: medido, ~2400 consultas de
 * `getProgramParameter` = ~2,5 s de hilo principal bloqueado.
 *
 * Aquí se compila bloque a bloque (se aísla cada bloque desenganchando el
 * resto de la escena y se vuelve a enganchar) y, con la cola todavía corta,
 * se fuerza el enlace y la reflexión de uniformes de ese bloque: el coste cae
 * en trozos de ~40-80 ms de JavaScript y ~130 ms por programa, con respiro
 * entre bloques, así que la interfaz, el cursor y el scroll siguen vivos.
 *
 * Nada de esto cambia el aspecto: los materiales son los mismos objetos, solo
 * se le pide a `three` que prepare sus programas antes de encender el bucle.
 */

type ProgramaGL = { getUniforms: () => unknown }
type Pintable = { objeto: Object3D; material: Material }

/** Materiales por bloque de compilación. */
const MAX_POR_BLOQUE = 14

const esperar = (ms: number) => new Promise<void>((listo) => window.setTimeout(listo, ms))

/** Objetos pintables de la escena, con su material (o materiales). */
function recolectar(escena: Scene): Pintable[] {
  const pintables: Pintable[] = []
  escena.traverse((objeto) => {
    const pintable = objeto as Object3D & {
      isMesh?: boolean
      isPoints?: boolean
      isLine?: boolean
      isSprite?: boolean
      material?: Material | Material[]
    }
    const soportaMaterial =
      pintable.isMesh || pintable.isPoints || pintable.isLine || pintable.isSprite
    if (!soportaMaterial || !pintable.material) return
    if (Array.isArray(pintable.material)) {
      for (const material of pintable.material) pintables.push({ objeto, material })
    } else {
      pintables.push({ objeto, material: pintable.material })
    }
  })
  return pintables
}

/** Materiales únicos de un subárbol. */
function materialesDe(objeto: Object3D): Material[] {
  const materiales = new Set<Material>()
  objeto.traverse((hijo) => {
    const pintable = hijo as Object3D & { material?: Material | Material[] }
    if (!pintable.material) return
    if (Array.isArray(pintable.material)) {
      for (const material of pintable.material) materiales.add(material)
    } else {
      materiales.add(pintable.material)
    }
  })
  return [...materiales]
}

function contieneLuz(objeto: Object3D): boolean {
  let hay = false
  objeto.traverse((hijo) => {
    if ((hijo as { isLight?: boolean }).isLight) hay = true
  })
  return hay
}

/**
 * Reparte la escena en bloques de compilación: se parte por la jerarquía
 * hasta que cada bloque baja de `MAX_POR_BLOQUE` materiales. Los subárboles
 * con luces no se parten (no se pueden desenganchar de la escena).
 */
function repartir(escena: Scene): Object3D[] {
  const bloques: Object3D[] = []
  const dividir = (objeto: Object3D) => {
    const materiales = materialesDe(objeto).length
    if (materiales === 0) return
    if (materiales <= MAX_POR_BLOQUE || objeto.children.length === 0 || contieneLuz(objeto)) {
      bloques.push(objeto)
      return
    }
    for (const hijo of objeto.children) dividir(hijo)
  }
  for (const hijo of escena.children) dividir(hijo)
  return bloques
}

/**
 * Deja el bloque `objeto` como único pintable de la escena: desengancha sus
 * hermanos en cada nivel (menos los que llevan luces, que hacen falta para
 * calcular los shaders). Devuelve lo movido para reponerlo tal cual.
 */
function aislar(objeto: Object3D): { objeto: Object3D; padre: Object3D }[] {
  const movidos: { objeto: Object3D; padre: Object3D }[] = []
  let actual: Object3D | null = objeto
  while (actual !== null) {
    const padre: Object3D | null = actual.parent
    if (padre === null) break
    for (const hermano of [...padre.children]) {
      if (hermano === actual || contieneLuz(hermano)) continue
      padre.remove(hermano)
      movidos.push({ objeto: hermano, padre })
    }
    actual = padre
  }
  return movidos
}

/** Programa en uso por un material, si `compile()` ya lo preparó. */
function programaDe(gl: WebGLRenderer, material: Material): ProgramaGL | undefined {
  const propiedades = gl.properties.get(material) as
    | { currentProgram?: ProgramaGL }
    | undefined
  return propiedades?.currentProgram
}

/**
 * Fuerza el enlace del programa y su reflexión de uniformes.
 *
 * `isReady()` puede decir que sí mientras ANGLE/Chrome difiere la compilación
 * real al primer uso; la consulta de uniformes sí obliga a hacerla. Con la
 * cola del driver corta (se acaba de emitir este bloque) el bloqueo es de
 * ~150 ms y no de la cola entera.
 */
function prepararPrograma(programa: ProgramaGL) {
  programa.getUniforms()
}

/**
 * Devuelve una promesa que se resuelve cuando todos los shaders de la escena
 * están compilados (o cuando `sigueVivo()` deja de ser cierto, p. ej. al
 * desmontar). El hilo principal solo se ocupa en trozos pequeños.
 */
export async function precompilarShaders(
  gl: WebGLRenderer,
  escena: Scene,
  camara: Camera,
  sigueVivo: () => boolean,
): Promise<void> {
  const pintables = recolectar(escena)
  if (pintables.length === 0) return

  const preparados = new Set<ProgramaGL>()
  const vistos = new Set<Material>()
  for (const { material } of pintables) {
    const programa = programaDe(gl, material)
    if (programa) {
      preparados.add(programa)
      vistos.add(material)
    }
  }

  for (const bloque of repartir(escena)) {
    if (!sigueVivo()) return
    const materiales = materialesDe(bloque)
    // Si todos sus materiales ya tienen programa (otro bloque los compartía),
    // no hay nada que compilar ni que consultar.
    if (materiales.every((material) => vistos.has(material))) continue

    const movidos = aislar(bloque)
    gl.compile(escena, camara)
    for (const { objeto, padre } of movidos) padre.add(objeto)

    for (const material of materiales) {
      vistos.add(material)
      const programa = programaDe(gl, material)
      if (!programa || preparados.has(programa)) continue
      preparados.add(programa)
      if (!sigueVivo()) return
      prepararPrograma(programa)
    }

    // Deja respirar a la interfaz entre bloques (cursor, scroll, animaciones).
    await esperar(0)
  }
}
