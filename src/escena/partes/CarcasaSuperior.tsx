import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { useUsoTienda, hexAcento } from '../../estado/usoTienda'
import { Parte } from './Parte'
import { crearTexturaPanal } from './panal'

/**
 * Capa 1 (la superior): carcasa con panal de abeja.
 *
 * Cubierta trasera + joroba de la palma + las dos planchas clicables que
 * forman la cara frontal (en un ratón real los botones son parte de la
 * cubierta, así la silueta montada queda continua). Entre las planchas
 * queda una ranura de 6 cm escalada por la que asoma la rueda con su luz.
 * Es la última pieza en separarse, para que el despiece se lea de abajo
 * arriba.
 */
export function CarcasaSuperior() {
  const acento = useUsoTienda((s) => s.acento)
  const hex = hexAcento(acento)
  const panal = useMemo(() => crearTexturaPanal(), [])

  return (
    <Parte desplazamiento={[0, 1.95, -0.04]} retardo={0.5} giro={[0, 0, 0.05]}>
      {/* Cubierta trasera */}
      <RoundedBox args={[0.545, 0.32, 0.64]} radius={0.1} smoothness={5} position={[0, 0.27, -0.18]}>
        <meshStandardMaterial
          color="#161a21"
          roughness={0.42}
          metalness={0.3}
          bumpMap={panal}
          bumpScale={0.15}
        />
      </RoundedBox>

      {/* Planchas clicables: la cara frontal del ratón */}
      <RoundedBox
        args={[0.24, 0.32, 0.5]}
        radius={0.075}
        smoothness={5}
        position={[-0.1485, 0.27, 0.36]}
        rotation={[-0.1, 0, 0]}
      >
        <meshStandardMaterial
          color="#161a21"
          roughness={0.42}
          metalness={0.3}
          bumpMap={panal}
          bumpScale={0.15}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.24, 0.32, 0.5]}
        radius={0.075}
        smoothness={5}
        position={[0.1485, 0.27, 0.36]}
        rotation={[-0.1, 0, 0]}
      >
        <meshStandardMaterial
          color="#161a21"
          roughness={0.42}
          metalness={0.3}
          bumpMap={panal}
          bumpScale={0.15}
        />
      </RoundedBox>

      {/* Joroba de la palma */}
      <mesh position={[0, 0.38, -0.16]} scale={[1, 0.6, 1.35]}>
        <sphereGeometry args={[0.26, 32, 24]} />
        <meshStandardMaterial
          color="#161a21"
          roughness={0.42}
          metalness={0.3}
          bumpMap={panal}
          bumpScale={0.15}
        />
      </mesh>

      {/* Logo luminoso "V" sobre la joroba */}
      <mesh position={[-0.022, 0.522, -0.34]} rotation={[1.05, 0.5, 0]}>
        <boxGeometry args={[0.018, 0.005, 0.1]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={4} />
      </mesh>
      <mesh position={[0.022, 0.522, -0.34]} rotation={[1.05, -0.5, 0]}>
        <boxGeometry args={[0.018, 0.005, 0.1]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={4} />
      </mesh>

      {/* Tiras de luz laterales */}
      <mesh position={[0.2735, 0.24, -0.1]}>
        <boxGeometry args={[0.008, 0.018, 0.44]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[-0.2735, 0.24, -0.1]}>
        <boxGeometry args={[0.008, 0.018, 0.44]} />
        <meshStandardMaterial color="#05070b" emissive={hex} emissiveIntensity={2.4} />
      </mesh>
    </Parte>
  )
}
