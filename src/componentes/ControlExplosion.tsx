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
    <div className="control">
      <div className="control__fila">
        <label htmlFor="deslizador-despiece" className="etiqueta">
          Descomposición
        </label>
        <span className="control__valor">{porcentaje} %</span>
      </div>

      <div className="medidor">
        <div className="medidor__pista" aria-hidden="true">
          <span
            className="medidor__relleno"
            style={{ transform: `scaleX(${porcentaje / 100})` }}
          />
        </div>
        <input
          id="deslizador-despiece"
          type="range"
          min={0}
          max={100}
          step={1}
          value={porcentaje}
          onChange={(e) => definir(Number(e.target.value) / 100)}
          className="deslizador"
          aria-label="Nivel de descomposición del ratón"
        />
      </div>

      <div className="segmentos">
        <button
          type="button"
          onClick={() => definir(0)}
          className="segmento"
          aria-pressed={porcentaje === 0}
        >
          Montar
        </button>
        <button
          type="button"
          onClick={() => definir(1)}
          className="segmento"
          aria-pressed={porcentaje === 100}
        >
          Explosionar
        </button>
      </div>
    </div>
  )
}
