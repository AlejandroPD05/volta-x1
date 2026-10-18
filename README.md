# VOLTA X1 — Landing 3D interactiva

Landing page de producto para **VOLTA X1**, un ratón gaming inalámbrico de 45 g
(ficticio, creado para portafolio). El ratón se renderiza en 3D en tiempo real
con geometría procedural, gira libremente con el arrastre, se auto-rotaciona
cuando se le deja en paz y **se descompone capa a capa** al hacer scroll o con
los controles de la interfaz, con hotspots flotantes que abren fichas técnicas
de cada pieza.

> ⚠️ VOLTA es una marca ficticia. Producto, especificaciones y precio son
> inventados: es una demo técnica de e-commerce, no una tienda real.

## Qué incluye

- **Héroe 3D** con entrada cinematográfica (zoom + partículas + neones), luz de
  estudio, rim lights y sombras suaves de contacto.
- **Rotación 360° libre** (arrastre y auto-rotación en reposo) con límites de
  inclinación para que nunca se vea "por debajo del suelo".
- **Despiece de 6 capas** (`Carcasa superior → Interruptores → Rueda → PCB →
  Batería → Base`) controlado por scroll, por un **slider manual** o por los
  botones *Explosionar / Montar*. El ensamblaje se invierte al bajar a la
  siguiente sección.
- **Hotspots 3D**: puntos anclados a la posición de cada pieza en el despiece
  (giran y flotan con el ratón) que abren tarjetas glassmorphism con las cifras
  del componente.
- **Selección de color** con tres acentos neón (cyan, púrpura, lima) que tiñen
  LEDs, interfaz y hasta el polvo de partículas.
- **Micro-interacciones** por todas partes: cursor propio con inercia,
  contadores animados, reveals con Framer Motion, panel de control con lectura
  en vivo del porcentaje de despiece.
- **Rendimiento y accesibilidad**: un único canvas de pantalla completa bajo la
  capa DOM, valores continuos fuera de React (sin re-renders por frame), `dpr`
  limitado, sin shadow maps, `prefers-reduced-motion` respetado (desactiva
  intro, auto-rotación y partículas) y arrastre desactivado en táctil para no
  secuestrar el scroll.

## Stack

| Capa | Tecnología |
| --- | --- |
| Build | Vite 8 + TypeScript 6 |
| UI | React 19 + Tailwind CSS v4 |
| 3D | three.js + @react-three/fiber + @react-three/drei |
| Post-proceso | @react-three/postprocessing (bloom + viñeta) |
| Animación | GSAP (intro) + Framer Motion (DOM) + useFrame (escena) |
| Estado | Zustand (objetivos/UI) + objeto mutable `sim` (por-frame) |
| Tests | Vitest |
| Tipografías | Orbitron, Space Grotesk y JetBrains Mono (auto-hospedadas) |

## Cómo funciona el despiece

1. **ScrollDirector** (`src/componentes/ScrollDirector.tsx`) mapea el scroll de
   la sección `#tecnologia` a un objetivo 0→1 en Zustand (`objetivoExplosion`),
   y la sección `#color` lo revierte a 0 para volver a montar el ratón.
2. **Simulador** (`src/escena/Simulador.tsx`) suaviza ese objetivo con una
   exponencial amortiguada y lo escribe en `sim.explosion` (fuera de React).
3. Cada capa (`src/escena/partes/*`) lee `sim.explosion` en su propio
   `useFrame` y separa sus piezas con un **retardo** por componente: la
   carcasa se levanta primero —como al abrir un ratón de verdad— y tras ella
   salen rueda, botones, PCB y batería, mientras la base se queda de suelo.
   Al montar, el orden se invierte y la tapa vuelve a cerrarse la última, así
   que las piezas nunca se cruzan entre sí.
4. Los **hotspots** (`src/escena/Hotspot.tsx`) viven dentro del grupo del ratón,
   en posiciones ajustadas al despiece completo, y aparecen escalonados según
   avanza la explosión.
5. **Camara** (`src/escena/Camara.tsx`) sube el punto de mira, se aleja y
   reorienta con `lookAt` propio para que el despiece completo quepa en
   pantalla en cualquier relación de aspecto.

## Estructura

```
src/
  componentes/   # capa DOM: hero, secciones, nav, cursor, controles
  escena/        # el ratón 3D: partes/, cámara, luces, efectos, hotspots
  datos/         # especificaciones y contenido de hotspots
  estado/        # zustand (objetivos) + sim (valores por-frame)
  utiles/        # matemáticas (mezclar, esponjar, acotar…) con tests
  estilos/       # tema, tokens y utilidades (Tailwind v4)
```

## Scripts

```bash
npm install     # dependencias
npm run dev     # servidor de desarrollo (http://localhost:5173)
npm run build   # type-check + bundle de producción
npm run preview # sirve el bundle de producción
npm run lint    # eslint
npm test        # vitest (unitarios)
```

## Notas

- No se usan modelos GLTF: todo el ratón es geometría procedural. La carcasa se
  genera con un *loft* paramétrico —planta y perfil barridos con splines
  Catmull-Rom y secciones superelípticas— en
  `src/escena/partes/geometriaRaton.ts`; el resto combina cajas redondeadas,
  cilindros y formas extruidas. Todo se retoca por parámetros.
- El bundle incluye three.js (~1.6 MB, ~465 kB gzip). Se puede dividir con
  `codeSplitting` si el proyecto creciera, pero para una sola página con
  canvas permanente se prioriza el arranque sin saltos.
- **Cabeceras de seguridad**: el sitio se publica en GitHub Pages, que no
  permite configurar cabeceras de respuesta propias (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`). Si algún día se
  migra a un hosting con soporte (Vercel, Netlify, Cloudflare Pages), habría
  que añadirlas en la configuración del despliegue.
