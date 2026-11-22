# VOLTA X1 — Landing 3D interactiva

Landing page de producto para **VOLTA X1**, un ratón gaming inalámbrico de 45 g
(ficticio, creado para portafolio). El ratón se renderiza en 3D en tiempo real
con un modelo generado en Blender a partir de cotas reales, gira libremente con el arrastre, se auto-rotaciona
cuando se le deja en paz y **se descompone capa a capa** al hacer scroll o con
los controles de la interfaz, con hotspots flotantes que abren fichas técnicas
de cada pieza.

> ⚠️ VOLTA es una marca ficticia. Producto, especificaciones y precio son
> inventados: es una demo técnica de e-commerce, no una tienda real.

> **Caso de estudio:** [de 2,9 s de congelación a 60 fps estables](docs/caso-60fps.md)

## Qué incluye

- **Héroe fotográfico**: giro de 360° renderizado en Cycles que se arrastra y
  se tiñe con el color elegido.
- **Despiece fotográfico**: la explosión del ratón, con PCB, batería y
  switches, renderizada en Cycles y reproducida con el scroll; abierto del
  todo, se gira 360°.
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
| Post-proceso | @react-three/postprocessing (bloom); viñeta por CSS |
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

- **Forma del ratón**: calcada del HyperX Pulsefire Surge (120 × 63 × 41 mm,
  joroba a 69 mm de la nariz) a partir de cotas medidas sobre fotos de
  referencia: silueta lateral, planta, secciones frontal y trasera, recorrido
  de la tira RGB de 360°, cuencos y pliegue de los botones, pozo de la rueda
  con botón DPI, dos botones laterales en el flanco izquierdo, patines y base.
  La marca, el logotipo y las especificaciones siguen siendo de VOLTA.
- **Pipeline 3D**: `modelado/surge.py` construye el modelo en Blender (loft en
  milímetros → remallado por vóxeles → booleanas → diezmado → biseles de
  0,25 mm en las aristas de molde → oclusión ambiental horneada con Cycles en
  el color de vértice) y exporta `src/escena/modelos/raton.glb` (≈1,4 MB,
  ≈42 k triángulos; sin materiales ni UV). Los materiales, el despiece y las piezas internas (PCB,
  batería, switches, encoder) siguen en código. Para regenerarlo (Blender 4.5+):

  ```bash
  blender --background --factory-startup --python modelado/surge.py -- src/escena/modelos/raton.glb [carpeta_renders]
  ```

  Con `carpeta_renders` saca además vistas ortográficas para comparar con las
  fotos. El GLB se carga con `GLTFLoader` sin Draco ni Meshopt: la CSP del
  sitio no permite WebAssembly.
- **Héroe fotográfico**: el ratón del héroe es un giro de 360° renderizado en
  Cycles (`modelado/giro.py`, 72 fotogramas en dos pasadas: estudio y solo la
  luz de la tira en blanco). `GiroFoto.tsx` los suma en un `<canvas>` tiñendo
  la luz con el acento, gira al arrastrar (o con las flechas), rota solo en
  reposo y al cambiar de color da una vuelta con un barrido del tono nuevo. El
  3D en vivo se oculta mientras el giro está a la vista:

  ```bash
  blender --background modelado/raton.blend --python modelado/giro.py -- modelado/giro
  # después: copiar modelado/giro/{base,luz}/*.webp a src/assets/giro/
  ```

- **Despiece fotográfico**: la explosión de Tecnología también es una
  secuencia de Cycles (`modelado/despiece.py`, 60 fotogramas en las mismas dos
  pasadas). Las piezas internas solo existen en la escena de la web, así que
  se exportan desde ella a `modelado/despiece/web.glb` (las seis capas de
  `Raton`, con el despiece a cero, con `GLTFExporter` y la opción
  `onlyVisible: false`). El script las sustituye por las piezas densas de
  `raton.blend` cuando coinciden, anima cada capa con los desplazamientos y
  retardos de `Parte`, aleja la cámara orbitando y escribe `hotspots.json` con
  la posición en pantalla de cada hotspot por fotograma. `DespieceFoto.tsx`
  elige el fotograma con `sim.explosion` (scroll, deslizador y botones siguen
  igual), coloca los marcadores encima y oculta el ratón 3D mientras se ve.
  Con el despiece al 100 % se puede girar 360° (arrastre, flechas o rotación
  en reposo): `--giro 72` renderiza esa vuelta con la cámara del último
  fotograma de la explosión, y al volver a montarlo regresa primero al frente.
  La pasada base sale con canal alfa y la alfombrilla se desvanece, así que la
  foto se funde con el fondo de la página:

  ```bash
  blender --background modelado/raton.blend --python modelado/despiece.py -- modelado/despiece/render
  blender --background modelado/raton.blend --python modelado/despiece.py -- modelado/despiece/giro --giro 72
  # después: copiar modelado/despiece/render/{base,luz}/*.webp y hotspots.json a src/assets/despiece/
  # y modelado/despiece/giro/{base,luz}/*.webp y hotspots.json a src/assets/despiece/giro/
  ```

- **Renders fotorrealistas** (copias WebP de 17–31 kB en `src/assets/estudio/`,
  galería «En el estudio» al final de la ficha técnica; los PNG originales
  quedan en `modelado/renders/`, fuera de git): `modelado/render.py` monta en
  Cycles una escena de producto sobre el modelo denso: materiales PBR
  procedurales (soft-touch con sheen y grano de molde, flancos granulados,
  piano black en el pozo y el DPI, goma, PTFE), alfombrilla con la tela
  `bi_stretch` y luz del HDRI `studio_small_09` (ambos de Poly Haven, CC0, en
  `modelado/polyhaven/`, fuera de git: se descargan de polyhaven.com en 2k,
  el HDR y los mapas `diff`, `rough` y `nor_gl` en JPG), softbox principal + recorte trasero,
  cámara de 85–100 mm con profundidad de campo y AgX. Para regenerarlos:

  ```bash
  blender --background --factory-startup --python modelado/surge.py -- modelado/raton.blend
  blender --background modelado/raton.blend --python modelado/render.py -- modelado/renders heroe lateral trasera rueda
  ```

- **Mapas horneados** (`src/escena/modelos/horneado/`, 224 kB): Cycles hornea
  del modelo denso al ligero el mapa de normales (sin facetas del diezmado), la
  oclusión ambiental y la luz que la tira proyecta sobre el propio casco; en la
  web esa luz se tiñe con el acento y la recorre la sobrecarga. Tras generar
  el GLB, `python modelado/empaquetar.py` (Pillow) los pasa a WebP.
- **Tonemapping AgX** en el compositor, el mismo de los renders de Cycles.
- **Luz de la escena 3D**: el mismo HDRI `studio_small_09` (reducido a
  512 × 256, 400 kB, en `src/escena/modelos/estudio.hdr`) es la base del mapa
  de entorno; los `Lightformer`s de neón van encima.
- **Rendimiento**: las capas internas no se dibujan con el ratón montado (153 → 21 llamadas de dibujo) y, si los fotogramas pasan de
  30 ms (GPU muy justa o WebGL por software), la escena arranca ya, antes de
  mostrarse, en
  modo ligero: dpr 0,75 y sin bloom.
- Al cambiar de color, la sobrecarga recorre los LEDs mientras el ratón da una
  vuelta con un pequeño salto y una onda expansiva sale por el suelo (todo se
  desactiva con movimiento reducido).
- El bundle incluye three.js (~1.6 MB, ~465 kB gzip). Se puede dividir con
  `codeSplitting` si el proyecto creciera, pero para una sola página con
  canvas permanente se prioriza el arranque sin saltos.
- **Cabeceras de seguridad**: el sitio se publica en GitHub Pages, que no
  permite configurar cabeceras de respuesta propias (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`). Como mitigación,
  el HTML incluye metas de `referrer` y de `Content-Security-Policy` (verificada
  contra el build real). Si algún día se migra a un hosting con soporte (Vercel,
  Netlify, Cloudflare Pages), habría que añadir las cabeceras completas en la
  configuración del despliegue.
