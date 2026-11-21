import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AddEquation,
  type BufferGeometry,
  CustomBlending,
  Layers,
  type Mesh,
  MeshBasicMaterial,
  OneFactor,
  RingGeometry,
  SrcAlphaFactor,
  ZeroFactor,
} from 'three'
import { onda } from '../sobrecarga'
import { COLA_Z, NARIZ_Z } from './geometriaRaton'

const CENTRO_Z = (NARIZ_Z + COLA_Z) / 2
const CAPA_LUZ = 1

/**
 * Suma de luz que no toca el alfa del lienzo: el canvas es transparente
 * (debajo está el fondo CSS de la página) y con `AdditiveBlending` el anillo
 * también sumaría su opacidad al alfa, oscureciendo el fondo.
 */
function materialLuz(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    opacity: 0,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: SrcAlphaFactor,
    blendDst: OneFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
  })
}

/**
 * Onda expansiva en el suelo al cambiar de color: un anillo y un eco algo
 * más tardío salen de debajo del ratón mientras la sobrecarga recorre los
 * LEDs. Solo existe durante el barrido; en reposo no se dibuja nada.
 */
export function OndaSuelo() {
  const anillo = useRef<Mesh<BufferGeometry, MeshBasicMaterial>>(null)
  const eco = useRef<Mesh<BufferGeometry, MeshBasicMaterial>>(null)

  // Capa 1: la ve la cámara principal pero no la de `ContactShadows`, que si
  // no hornearía los anillos como sombra.
  const camara = useThree((s) => s.camera)
  useEffect(() => {
    camara.layers.enable(CAPA_LUZ)
  }, [camara])
  const capas = useMemo(() => {
    const l = new Layers()
    l.set(CAPA_LUZ)
    return l
  }, [])

  const recursos = useMemo(
    () => ({
      geometriaAnillo: new RingGeometry(0.94, 1, 96),
      materialAnillo: materialLuz(),
      materialEco: materialLuz(),
    }),
    [],
  )
  useFrame(() => {
    const activo = onda.activo.value > 0
    const p = activo ? onda.progreso.value : 1
    // Onda expansiva: anillo principal y un eco algo más tardío.
    for (const [malla, retraso, escalaMax] of [
      [anillo.current, 0, 3.6],
      [eco.current, 0.18, 2.6],
    ] as const) {
      if (!malla) continue
      const material = malla.material
      const t = Math.max(0, (p - retraso) / (1 - retraso))
      malla.visible = activo && t > 0 && t < 1
      if (!malla.visible) continue
      const salida = 1 - Math.pow(1 - t, 3)
      malla.scale.setScalar(0.45 + (escalaMax - 0.45) * salida)
      material.color.copy(onda.hasta.value)
      material.opacity = Math.pow(1 - t, 1.6) * 0.85
    }
  })

  return (
    <group position={[0, 0.0015, CENTRO_Z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh
        ref={anillo}
        geometry={recursos.geometriaAnillo}
        material={recursos.materialAnillo}
        layers={capas}
      />
      <mesh
        ref={eco}
        geometry={recursos.geometriaAnillo}
        material={recursos.materialEco}
        layers={capas}
      />
    </group>
  )
}
