import { useMemo } from 'react'
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector2,
  type Texture,
} from 'three'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'
import { crearTexturasRayado, crearTexturaGrano, crearTexturaRugosidad } from './texturas'
import { useModeloRaton } from './modeloRaton'
import { MM, NARIZ_Z } from './geometriaRaton'
import { parchearOnda } from '../sobrecarga'
import { OndaSuelo } from './OndaSuelo'

/**
 * Etiqueta inferior: fondo negro con franja plateada, código de barras y
 * renglones de texto impresos (sin letras reales: se ve desde cualquier
 * lado sin quedar en espejo). Las UV del GLB son triplanares (1 u = 10 mm),
 * así que la textura se encaja sobre la placa de 28 × 34 mm.
 */
function crearTexturaEtiqueta(): Texture {
  const lienzo = document.createElement('canvas')
  lienzo.width = 280
  lienzo.height = 340
  const ctx = lienzo.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#101216'
    ctx.fillRect(0, 0, 280, 340)
    ctx.fillStyle = '#9ea4ab'
    ctx.fillRect(0, 0, 280, 46)
    ctx.fillStyle = '#d9dde2'
    for (let i = 0, x = 24; x < 250; i++) {
      const ancho = 1 + ((i * 7) % 5)
      ctx.fillRect(x, 70, ancho, 64)
      x += ancho + 2 + ((i * 3) % 4)
    }
    ctx.fillStyle = '#7d848c'
    for (let fila = 0; fila < 9; fila++) {
      const largo = 120 + ((fila * 53) % 110)
      ctx.fillRect(24, 156 + fila * 16, largo, 5)
    }
    ctx.strokeStyle = '#7d848c'
    ctx.lineWidth = 3
    for (let i = 0; i < 4; i++) ctx.strokeRect(30 + i * 58, 302, 34, 26)
  }
  const textura = new CanvasTexture(lienzo)
  textura.colorSpace = SRGBColorSpace
  textura.wrapS = ClampToEdgeWrapping
  textura.wrapT = ClampToEdgeWrapping
  // Placa: x ∈ [-14, 14] mm, z ∈ [52, 86] mm desde la nariz.
  const u0 = -1.4
  const v0 = (52 - 64.124) / 10
  textura.repeat.set(1 / 2.8, 1 / 3.4)
  textura.offset.set(-u0 / 2.8, -v0 / 3.4)
  return textura
}

/**
 * Capa 6 (la más baja): flancos y base.
 *
 * En el Surge la pieza inferior sube por los costados hasta la tira RGB —por
 * eso los flancos tienen otro tacto, un plástico granulado sin goma— y
 * remata la cola por debajo de la «lengua» de la cubierta. Aquí viven la
 * tira perimetral que separa ambas carcasas (rehundida bajo el labio de los
 * botones en la nariz), los rebajes de los botones laterales, el puerto
 * USB-C, los dos patines grandes, la ventana del sensor y la etiqueta.
 * Esta capa no se desplaza: es el "suelo" del despiece.
 */
export function CarcasaInferior() {
  const modelo = useModeloRaton()
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  const materiales = useMemo(() => {
    const grano = crearTexturaGrano(160, 5, 0.55)
    const satinado = crearTexturaRugosidad({ semilla: 31 })
    satinado.repeat.set(0.1, 0.1)
    const rayado = crearTexturasRayado()
    rayado.rugosidad.repeat.set(0.6, 0.6)
    rayado.normal.repeat.set(0.6, 0.6)

    return {
      // Flancos: plástico granulado, algo más claro y seco que la cubierta.
      flancos: new MeshStandardMaterial({
        color: '#0c0d10',
        vertexColors: true,
        roughness: 0.78,
        envMapIntensity: 0.45,
        metalness: 0,
        roughnessMap: satinado,
        bumpMap: grano,
        bumpScale: 0.3,
      }),
      interior: new MeshStandardMaterial({
        color: '#0b0c10',
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.05,
      }),
      // Patines de PTFE negro, con el fresado marcado en el brillo.
      ptfe: new MeshStandardMaterial({
        color: '#1d1f23',
        vertexColors: true,
        roughness: 0.38,
        metalness: 0.05,
        roughnessMap: rayado.rugosidad,
        normalMap: rayado.normal,
        normalScale: new Vector2(0.3, 0.3),
      }),
      etiqueta: new MeshStandardMaterial({
        map: crearTexturaEtiqueta(),
        vertexColors: true,
        roughness: 0.55,
        metalness: 0.1,
      }),
      metal: new MeshStandardMaterial({ color: '#9aa4b0', roughness: 0.35, metalness: 0.85 }),
      negro: new MeshStandardMaterial({ color: '#060709', roughness: 0.6, metalness: 0.2 }),
    }
  }, [])

  // Solo la tira y la lente dependen del acento.
  const materialesAcento = useMemo(
    () => ({
      tira: parchearOnda(
        new MeshStandardMaterial({
          color: '#0a0c10',
          emissive: hex,
          emissiveIntensity: 2.6,
          roughness: 0.35,
        }),
      ),
      lente: parchearOnda(
        new MeshStandardMaterial({
          color: '#0a0c10',
          emissive: hex,
          emissiveIntensity: 0.7,
          roughness: 0.2,
          metalness: 0.4,
        }),
      ),
    }),
    [hex],
  )

  // Puerto USB-C (hueco de 8,6 × 3 mm a 4,6 mm del suelo): fondo negro y
  // lengüeta metálica asomando hacia la boca.
  const yPuerto = 4.6 * MM
  return (
    <Parte desplazamiento={[0, -0.02, 0]} retardo={0}>
      <OndaSuelo />
      <mesh geometry={modelo.CarcasaInferior.geometria} material={materiales.flancos} />
      <mesh geometry={modelo.CarcasaInferiorInterior.geometria} material={materiales.interior} />
      <mesh geometry={modelo.TiraRGB.geometria} material={materialesAcento.tira} />
      <mesh geometry={modelo.PatinDelantero.geometria} material={materiales.ptfe} />
      <mesh geometry={modelo.PatinTrasero.geometria} material={materiales.ptfe} />
      <mesh geometry={modelo.Etiqueta.geometria} material={materiales.etiqueta} />
      <mesh geometry={modelo.Lente.geometria} material={materialesAcento.lente} />

      <mesh material={materiales.negro} position={[0, yPuerto, NARIZ_Z - 6.4 * MM]}>
        <boxGeometry args={[8.4 * MM, 2.8 * MM, 1 * MM]} />
      </mesh>
      <mesh material={materiales.metal} position={[0, yPuerto, NARIZ_Z - 4.2 * MM]}>
        <boxGeometry args={[6.4 * MM, 0.7 * MM, 4 * MM]} />
      </mesh>

      {/* Interruptor de encendido deslizante, entre el patín y el sensor */}
      <mesh material={materiales.negro} position={[0, 0.0008, NARIZ_Z - 35.5 * MM]}>
        <boxGeometry args={[9 * MM, 0.4 * MM, 5 * MM]} />
      </mesh>
      <mesh material={materiales.metal} position={[1.8 * MM, -0.0012, NARIZ_Z - 35.5 * MM]}>
        <boxGeometry args={[3.2 * MM, 0.6 * MM, 3 * MM]} />
      </mesh>
    </Parte>
  )
}
