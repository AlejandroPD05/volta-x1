import { ACENTOS, useUsoTienda, type Acento } from '../estado/usoTienda'

const LISTA: Acento[] = ['cyan', 'purpura', 'lima']

/**
 * Sección de iluminación: mientras baja, ScrollDirector vuelve a montar el
 * ratón (1→0), de modo que al llegar aquí lo ves entero, girando, y cada
 * acento repinta en vivo los LEDs del modelo y toda la interfaz.
 */
export function SeccionColor() {
  const acento = useUsoTienda((s) => s.acento)
  const definir = useUsoTienda((s) => s.definirAcento)

  return (
    <section id="color" className="relative h-[150vh]">
      <div className="pointer-events-none sticky top-0 flex h-[100svh] flex-col items-center justify-between py-24">
        <header className="px-6 text-center">
          <p className="etiqueta-seccion">04 · Iluminación</p>
          <h2 className="titulo-grande mt-3 text-[clamp(1.8rem,4.5vw,3.2rem)] text-white">
            Tu luz. Tu <span className="texto-acento">firma</span>.
          </h2>
          <p className="texto-apagado mx-auto mt-3 max-w-md text-sm sm:text-base">
            RGB direccionable con 16,8 millones de colores. Elige un acento y mira
            cómo reacciona el ratón — y toda la página.
          </p>
        </header>

        <div className="cristal interactivo flex flex-wrap items-center justify-center gap-1.5 rounded-2xl px-3 py-3 sm:gap-3 sm:px-5">
          {LISTA.map((id) => {
            const { nombre, hex } = ACENTOS[id]
            const activo = id === acento
            return (
              <button
                key={id}
                type="button"
                onClick={() => definir(id)}
                aria-pressed={activo}
                aria-label={`Acento ${nombre}`}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-all ${
                  activo
                    ? 'border-[var(--acento)] bg-white/5 text-white'
                    : 'texto-apagado border-transparent hover:text-white'
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ background: hex, boxShadow: `0 0 12px ${hex}` }}
                />
                {nombre}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
