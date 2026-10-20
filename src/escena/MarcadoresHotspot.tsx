import { useEffect, useMemo, useRef, type RefCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HOTSPOTS, type HotspotDato } from '../datos/especificaciones'
import { marcadores, sim } from '../estado/sim'
import { useUsoTienda } from '../estado/usoTienda'
import { escalonSuave, progresoPorRetardo } from '../utiles/mates'

/**
 * Capa DOM de los marcadores de hotspot.
 *
 * Los anclajes 3D (`Hotspot`, dentro del grupo del ratón) escriben su
 * posición proyectada en `marcadores` (src/estado/sim.ts); esta capa pinta
 * cada punto y su tarjeta sobre el lienzo. Posiciones, opacidad y escala se
 * aplican por estilo en cada cuadro, sin re-renders de React.
 */

type PropsPunto = {
  dato: HotspotDato
  indice: number
  registrar: (id: string, el: HTMLDivElement | null) => void
}

function PuntoHotspot({ dato, indice, registrar }: PropsPunto) {
  const activo = useUsoTienda((s) => s.hotspotActivo === dato.id)
  const abrir = useUsoTienda((s) => s.abrirHotspot)
  const alternar = useUsoTienda((s) => s.alternarHotspot)
  const cerrar = useUsoTienda((s) => s.cerrarHotspot)

  // ¿El dispositivo tiene hover real? Decide si el marcador se abre solo.
  const conHover = useMemo(() => window.matchMedia('(hover: hover)').matches, [])

  const enlazar: RefCallback<HTMLDivElement> = (nodo) => {
    registrar(dato.id, nodo)
    return () => registrar(dato.id, null)
  }

  return (
    <div
      ref={enlazar}
      className="hotspot"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: 'none',
      }}
      onMouseLeave={conHover ? cerrar : undefined}
    >
      <button
        type="button"
        className="hotspot__punto"
        aria-expanded={activo}
        aria-label={`${dato.titulo}: ${dato.dato}`}
        onMouseEnter={conHover ? () => abrir(dato.id) : undefined}
        onClick={() => {
          if (!conHover) alternar(dato.id)
        }}
      />

      <AnimatePresence>
        {activo && (
          <motion.div
            key="tarjeta"
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: dato.direccion === 'arriba' ? 12 : -12 }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: dato.direccion === 'arriba' ? 12 : -12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className={`tarjeta-hotspot interactivo tarjeta-hotspot--${dato.direccion}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] texto-acento">
                {String(indice).padStart(2, '0')}
              </p>
              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar tarjeta"
                className="texto-apagado text-xs transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>

            <h3 className="titulo-grande mt-1 text-sm text-white">{dato.titulo}</h3>
            <p className="titulo-grande texto-acento texto-glow mt-1 text-2xl">{dato.dato}</p>
            <p className="texto-apagado mt-2 text-xs leading-relaxed">{dato.resumen}</p>

            <ul className="mt-3 space-y-1">
              {dato.detalles.map((detalle) => (
                <li key={detalle} className="flex gap-2 text-[11px] text-slate-300">
                  <span className="texto-acento">▸</span>
                  {detalle}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MarcadoresHotspot({ activa }: { activa: boolean }) {
  const contenedores = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    const mapa = contenedores.current
    // Con la escena apagada (pie de página) o todavía compilando no hay nada
    // que proyectar: el bucle se apaga y los pulsos de los hotspots también.
    if (!activa) {
      for (const el of mapa.values()) {
        el.removeAttribute('data-visible')
        el.style.pointerEvents = 'none'
      }
      return
    }

    let raf = 0
    // Último estado escrito por marcador: solo se toca el DOM cuando cambia
    // de verdad. La transform también se cachea; en reposo (sobre todo con
    // movimiento reducido) la escena no se mueve y no hace falta reescribirla.
    type Cache = {
      opacidad: number
      puntero: boolean
      visible: boolean
      z: number
      x: number
      y: number
      escala: number
      ajusteX: number
    }
    const ultimo = new Map<string, Cache>()

    const pintar = () => {
      // La tarjeta abierta manda sobre el resto de puntos: su ancla sube de
      // z-index para que ningún marcador se dibuje encima del contenido.
      const idActivo = useUsoTienda.getState().hotspotActivo
      const anchoVista = window.innerWidth
      const anchoTarjeta = Math.min(268, anchoVista * 0.78)
      const margen = 12
      const minimo = margen + anchoTarjeta / 2
      const maximo = anchoVista - margen - anchoTarjeta / 2

      for (const dato of HOTSPOTS) {
        const el = mapa.get(dato.id)
        const pos = marcadores.get(dato.id)
        if (!el || !pos) continue

        const visibilidad = escalonSuave(progresoPorRetardo(sim.explosion, dato.aparece))
        const cache = ultimo.get(dato.id) ?? {
          opacidad: -1,
          puntero: false,
          visible: false,
          z: -9999,
          x: Number.NaN,
          y: Number.NaN,
          escala: -1,
          ajusteX: Number.NaN,
        }
        const puntero = visibilidad > 0.55
        const visible = visibilidad > 0.02

        if (visibilidad !== cache.opacidad) {
          el.style.opacity = String(visibilidad)
          cache.opacidad = visibilidad
        }
        if (puntero !== cache.puntero) {
          el.style.pointerEvents = puntero ? 'auto' : 'none'
          cache.puntero = puntero
        }
        if (visible !== cache.visible) {
          el.toggleAttribute('data-visible', visible)
          cache.visible = visible
        }
        const z = dato.id === idActivo ? 50 : pos.z
        if (z !== cache.z) {
          el.style.zIndex = String(z)
          cache.z = z
        }

        // En móvil, una tarjeta centrada sobre un punto pegado al borde se
        // saldría de la pantalla. El desplazamiento se aplica a la tarjeta;
        // el punto se queda donde marca la pieza.
        const centro = Math.min(maximo, Math.max(minimo, pos.x))
        const ajusteX = centro - pos.x
        if (ajusteX !== cache.ajusteX) {
          el.style.setProperty('--ajuste-x', `${ajusteX}px`)
          cache.ajusteX = ajusteX
        }

        const escala = 0.55 + 0.45 * visibilidad
        if (pos.x !== cache.x || pos.y !== cache.y || escala !== cache.escala) {
          el.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${escala})`
          cache.x = pos.x
          cache.y = pos.y
          cache.escala = escala
        }
        ultimo.set(dato.id, cache)
      }
      raf = requestAnimationFrame(pintar)
    }
    raf = requestAnimationFrame(pintar)
    return () => {
      cancelAnimationFrame(raf)
      for (const el of mapa.values()) {
        el.removeAttribute('data-visible')
        el.style.pointerEvents = 'none'
      }
    }
  }, [activa])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {HOTSPOTS.map((dato, i) => (
        <PuntoHotspot
          key={dato.id}
          dato={dato}
          indice={i + 1}
          registrar={(id, el) => {
            if (el) contenedores.current.set(id, el)
            else contenedores.current.delete(id)
          }}
        />
      ))}
    </div>
  )
}
