import type { CSSProperties } from 'react'
import { useUsoTienda } from '../estado/usoTienda'

/**
 * Controles manuales del despiece: deslizador 0-100 % y botones
 * Montar/Explosionar. Escriben el mismo `objetivoExplosion` que el scroll;
 * el suavizado de la escena se encarga de que no haya saltos cuando el
 * usuario alterna entre ambos.
 */
export function ControlExplosion() {
  // Se suscribe al porcentaje redondeado, no al valor continuo: durante el
  // scroll de la sección, el objetivo cambia en cada frame y este panel no
  // necesita re-renderizarse por cada milésima (solo por cada 1 %).
  const porcentaje = useUsoTienda((s) => Math.round(s.objetivoExplosion * 100))
  const definir = useUsoTienda((s) => s.definirObjetivo)

  return (
    <div className="cristal interactivo flex w-full flex-col gap-3 rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="etiqueta-seccion">Descomposición</span>
        <span className="font-mono text-xs texto-acento">{porcentaje} %</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={porcentaje}
        onChange={(e) => definir(Number(e.target.value) / 100)}
        className="deslizador"
        style={{ '--progreso': `${porcentaje}%` } as CSSProperties}
        aria-label="Nivel de descomposición del ratón"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => definir(0)}
          className="boton-fantasma flex-1 justify-center px-4 py-2 text-xs"
        >
          ⟲ Montar
        </button>
        <button
          type="button"
          onClick={() => definir(1)}
          className="boton-neon flex-1 justify-center px-4 py-2 text-xs"
        >
          ✦ Explosionar
        </button>
      </div>
    </div>
  )
}
