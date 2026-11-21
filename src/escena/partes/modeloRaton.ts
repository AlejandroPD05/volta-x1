import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { type BufferGeometry, Float32BufferAttribute, type Mesh, Vector3 } from 'three'
import { MM } from './geometriaRaton'
import urlModelo from '../modelos/raton.glb?url'

/**
 * Geometría del ratón modelada en Blender (`modelado/surge.py`).
 *
 * El GLB solo trae mallas: cada pieza llega con su nombre, en unidades de la
 * escena (nariz en +Z, flanco izquierdo en +X), con la oclusión ambiental
 * horneada en el color de vértice y sin materiales: los materiales siguen
 * viviendo en cada capa (las que usan la AO activan `vertexColors`). Se usa `GLTFLoader` directamente
 * (y no `useGLTF` de drei) para no arrastrar los decodificadores Draco y
 * Meshopt, que piden WebAssembly y la CSP del sitio no lo permite.
 */
export const PIEZAS = [
  'CarcasaSuperior',
  'CarcasaSuperiorInterior',
  'CarcasaInferior',
  'CarcasaInferiorInterior',
  'TiraRGB',
  'Bandeja',
  'BotonDPI',
  'Logo',
  'PatinDelantero',
  'PatinTrasero',
  'Etiqueta',
  'Lente',
  'Rueda',
  'BotonLateralDelantero',
  'BotonLateralTrasero',
] as const

export type Pieza = (typeof PIEZAS)[number]
export type ModeloRaton = Record<Pieza, { geometria: BufferGeometry; posicion: Vector3 }>

/**
 * UV por proyección triplanar (1 unidad UV = 10 mm): cada vértice se
 * proyecta sobre el plano al que más mira su normal. Así los mapas de grano
 * tienen la misma escala física en todo el ratón y el GLB no transporta UV.
 * La malla sigue indexada: desindexarla triplicaba los vértices y la GPU lo
 * pagaba (en las costuras entre proyecciones el grano se estira un poco,
 * pero con un relieve tan fino no se aprecia).
 */
function conUvTriplanar(geometria: BufferGeometry): BufferGeometry {
  const pos = geometria.attributes.position
  const nor = geometria.attributes.normal
  const uv = new Float32Array(pos.count * 2)
  const escala = 1 / (10 * MM)
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i))
    const ay = Math.abs(nor.getY(i))
    const az = Math.abs(nor.getZ(i))
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    let u = -z
    let v = y
    if (ay >= ax && ay >= az) {
      u = x
      v = -z
    } else if (az >= ax) {
      u = x
      v = y
    }
    uv[i * 2] = u * escala
    uv[i * 2 + 1] = v * escala
  }
  geometria.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return geometria
}

// Las cinco capas piden el modelo: se prepara una sola vez por GLB.
const preparados = new WeakMap<object, ModeloRaton>()

export function useModeloRaton(): ModeloRaton {
  const gltf = useLoader(GLTFLoader, urlModelo)
  let modelo = preparados.get(gltf)
  if (!modelo) {
    modelo = {} as ModeloRaton
    for (const nombre of PIEZAS) {
      const malla = gltf.scene.getObjectByName(nombre) as Mesh | undefined
      if (!malla) throw new Error(`Falta la pieza «${nombre}» en raton.glb`)
      modelo[nombre] = { geometria: conUvTriplanar(malla.geometry), posicion: malla.position.clone() }
    }
    preparados.set(gltf, modelo)
  }
  return modelo
}

// Descarga en paralelo con el resto del arranque.
useLoader.preload(GLTFLoader, urlModelo)
