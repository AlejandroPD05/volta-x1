import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import type { HotspotDato } from '../datos/especificaciones'
import { sim } from '../estado/sim'
import { useUsoTienda } from '../estado/usoTienda'
import { escalonSuave, progresoPorRetardo } from '../utiles/mates'

type Props = {
  dato: HotspotDato
  indice: number
}

/**
 * Marcador flotante anclado a una pieza en el espacio 3D (drei `Html`).
 *
 * Cada marcador tiene su propio umbral (`dato.aparece`): va emergiendo con
 * una pequeña escala y ganando opacidad a medida que su capa se separa.
 * En escritorio se abre al pasar el ratón; en táctil, al tocar.
 */
export function Hotspot({ dato, indice }: Props) {
  const envoltorio = useRef<HTMLDivElement>(null)
  const activo = useUsoTienda((s) => s.hotspotActivo === dato.id)
  const abrir = useUsoTienda((s) => s.abrirHotspot)
  const alternar = useUsoTienda((s) => s.alternarHotspot)
  const cerrar = useUsoTienda((s) => s.cerrarHotspot)

  // ¿El dispositivo tiene hover real? Decidesi el marcador se abre solo.
  const conHover = useMemo(() => window.matchMedia('(hover: hover)').matches, [])

  useFrame(() => {
    const el = envoltorio.current
    if (!el) return
    const visibilidad = escalonSuave(progresoPorRetardo(sim.explosion, dato.aparece))
    el.style.opacity = String(visibilidad)
    el.style.transform = `scale(${0.55 + 0.45 * visibilidad})`
    el.style.pointerEvents = visibilidad > 0.55 ? 'auto' : 'none'
  })

  return (
    <Html position={dato.posicion} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div
        ref={envoltorio}
        className="hotspot"
        style={{ width: 0, height: 0, opacity: 0 }}
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
              initial={{ opacity: 0, scale: 0.95, y: dato.direccion === 'arriba' ? 12 : -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: dato.direccion === 'arriba' ? 12 : -12 }}
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
    </Html>
  )
}
