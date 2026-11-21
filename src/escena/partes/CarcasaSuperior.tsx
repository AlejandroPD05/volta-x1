import { useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'
import { crearTexturaPanal } from './panal'
import { crearTexturaRugosidad } from './texturas'
import { useMapasHorneados } from './mapasHorneados'
import { useModeloRaton } from './modeloRaton'
import { parchearLuzTira, parchearOnda } from '../sobrecarga'

/**
 * Capa 1 (la superior): el casco, tal y como se monta en el Pulsefire Surge.
 *
 * Una sola pieza moldeada por encima de la tira RGB: cubierta de la palma y
 * los dos botones principales, separados por la ranura central que muere en
 * el pozo de la rueda. Cada botón tiene su cuenco para el dedo, rematado por
 * el pliegue que lo recorre de delante atrás. En el pozo, la bandeja negra
 * brillante y el botón DPI con su chevrón; en la grupa, el logotipo
 * retroiluminado. La cara interna (pared de 1,8 mm) lleva el nervado de
 * panal, visible al levantar la tapa en el despiece.
 */
export function CarcasaSuperior() {
  const modelo = useModeloRaton()
  const mapas = useMapasHorneados()
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  const texturas = useMemo(() => {
    // Satinado del roce con las UV triplanares (canal 1, 1 u = 10 mm): abarca
    // todo el casco y no depende del desplegado.
    const satinado = crearTexturaRugosidad({ contraste: 0.18, moteado: 0.02 })
    satinado.repeat.set(0.09, 0.09)
    satinado.channel = 1
    const panal = crearTexturaPanal(256, 5)
    panal.repeat.set(0.55, 0.55)
    return { satinado, panal }
  }, [])

  const materiales = useMemo(
    () => ({
      interior: new MeshStandardMaterial({
        color: '#0c0e12',
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.1,
        bumpMap: texturas.panal,
        bumpScale: 0.6,
      }),
      // Bandeja del pozo y botón DPI: plástico negro de alto brillo, con el
      // relieve y la oclusión horneados.
      bandeja: new MeshStandardMaterial({
        color: '#08090b',
        roughness: 0.12,
        metalness: 0,
        envMapIntensity: 1.3,
        normalMap: mapas.Bandeja.normal,
        aoMap: mapas.Bandeja.mat,
      }),
      dpi: new MeshStandardMaterial({
        color: '#0d0f13',
        roughness: 0.18,
        metalness: 0,
        envMapIntensity: 1.2,
        normalMap: mapas.BotonDPI.normal,
        aoMap: mapas.BotonDPI.mat,
      }),
    }),
    [texturas, mapas],
  )

  // Soft-touch negro con los mapas horneados de Blender: normales de la
  // malla densa, oclusión ambiental y la luz de la tira sobre el casco, que
  // se tiñe con el acento (por eso el material depende de él).
  const casco = useMemo(
    () =>
      parchearLuzTira(
        new MeshStandardMaterial({
          color: '#0b0c0e',
          roughness: 0.55,
          metalness: 0,
          roughnessMap: texturas.satinado,
          normalMap: mapas.CarcasaSuperior.normal,
          aoMap: mapas.CarcasaSuperior.mat,
          emissive: hex,
          emissiveMap: mapas.CarcasaSuperior.mat,
          emissiveIntensity: 0.9,
          envMapIntensity: 0.55,
        }),
      ),
    [hex, texturas, mapas],
  )

  // El logo es lo único del casco que depende del acento.
  const materialLogo = useMemo(
    () =>
      parchearOnda(
        new MeshStandardMaterial({
          color: '#05070b',
          emissive: hex,
          emissiveIntensity: 3.2,
          roughness: 0.4,
        }),
      ),
    [hex],
  )

  return (
    <Parte desplazamiento={[0, 1.95, -0.04]} retardo={0} giro={[0, 0, 0.05]}>
      <mesh geometry={modelo.CarcasaSuperior.geometria} material={casco} />
      <mesh geometry={modelo.CarcasaSuperiorInterior.geometria} material={materiales.interior} />
      <mesh geometry={modelo.Bandeja.geometria} material={materiales.bandeja} />
      <mesh geometry={modelo.BotonDPI.geometria} material={materiales.dpi} />
      <mesh geometry={modelo.Logo.geometria} material={materialLogo} />
    </Parte>
  )
}
