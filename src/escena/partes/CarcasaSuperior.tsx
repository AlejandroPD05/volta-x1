import { useMemo } from 'react'
import { MeshStandardMaterial, Vector2 } from 'three'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'
import { crearTexturaPanal } from './panal'
import { crearMapaNormal, crearTexturaRugosidad } from './texturas'
import { useModeloRaton } from './modeloRaton'
import { parchearOnda } from '../sobrecarga'

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
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)

  const materiales = useMemo(() => {
    // Las UV del GLB son triplanares a 1 unidad = 10 mm: el grano fino del
    // soft-touch repite cada 2,5 mm (se intuye en el brillo, no se ve como
    // estuco) y el satinado de roce abarca todo el casco.
    const grano = crearMapaNormal({ repeticion: 4, fuerza: 1.6, manchas: 0.2, semilla: 7 })
    const satinado = crearTexturaRugosidad({ contraste: 0.18, moteado: 0.02 })
    satinado.repeat.set(0.09, 0.09)
    const panal = crearTexturaPanal(256, 5)
    panal.repeat.set(0.55, 0.55)

    return {
      // Soft-touch negro: rugosidad alta con el satinado del roce, grano
      // fino en las normales y la oclusión horneada del GLB (vertexColors)
      // oscureciendo ranura, pozo, juntas y el labio de los botones. Es un
      // MeshStandardMaterial a propósito: el físico con sheen y clearcoat
      // costaba 3 ms por frame en una iGPU para un matiz que no se aprecia.
      casco: new MeshStandardMaterial({
        color: '#0b0c0e',
        vertexColors: true,
        roughness: 0.55,
        metalness: 0,
        roughnessMap: satinado,
        normalMap: grano,
        normalScale: new Vector2(0.1, 0.1),
        envMapIntensity: 0.55,
      }),
      interior: new MeshStandardMaterial({
        color: '#0c0e12',
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.1,
        bumpMap: panal,
        bumpScale: 0.6,
      }),
      // Bandeja del pozo y botón DPI: plástico negro de alto brillo.
      bandeja: new MeshStandardMaterial({
        color: '#08090b',
        vertexColors: true,
        roughness: 0.14,
        metalness: 0,
        envMapIntensity: 1.3,
      }),
      dpi: new MeshStandardMaterial({
        color: '#0d0f13',
        vertexColors: true,
        roughness: 0.2,
        metalness: 0,
        envMapIntensity: 1.2,
      }),
    }
  }, [])

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
      <mesh geometry={modelo.CarcasaSuperior.geometria} material={materiales.casco} />
      <mesh geometry={modelo.CarcasaSuperiorInterior.geometria} material={materiales.interior} />
      <mesh geometry={modelo.Bandeja.geometria} material={materiales.bandeja} />
      <mesh geometry={modelo.BotonDPI.geometria} material={materiales.dpi} />
      <mesh geometry={modelo.Logo.geometria} material={materialLogo} />
    </Parte>
  )
}
