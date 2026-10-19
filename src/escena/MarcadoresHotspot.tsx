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

export function MarcadoresHotspot() {
  const contenedores = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    let raf = 0
    // Último estado escrito por marcador: opacidad, puntero y z-index solo se
    // tocan cuando cambian de verdad (la transform sí es por frame: la escena
    // gira sola y el punto tiene que seguirla).
    const ultimo = new Map<string, { opacidad: number; puntero: boolean; z: number }>()

    const pintar = () => {
      for (const dato of HOTSPOTS) {
        const el = contenedores.current.get(dato.id)
        const pos = marcadores.get(dato.id)
        if (!el || !pos) continue

        const visibilidad = escalonSuave(progresoPorRetardo(sim.explosion, dato.aparece))
        const cache = ultimo.get(dato.id) ?? { opacidad: -1, puntero: false, z: -9999 }
        const puntero = visibilidad > 0.55

        if (visibilidad !== cache.opacidad) {
          el.style.opacity = String(visibilidad)
          cache.opacidad = visibilidad
        }
        if (puntero !== cache.puntero) {
          el.style.pointerEvents = puntero ? 'auto' : 'none'
          cache.puntero = puntero
        }
        if (pos.z !== cache.z) {
          el.style.zIndex = String(pos.z)
          cache.z = pos.z
        }
        ultimo.set(dato.id, cache)

        el.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${0.55 + 0.45 * visibilidad})`
      }
      raf = requestAnimationFrame(pintar)
    }
    raf = requestAnimationFrame(pintar)
    return () => cancelAnimationFrame(raf)
  }, [])

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
