import { create } from 'zustand'
import { acotar } from '../utiles/mates'

export type Acento = 'cyan' | 'purpura' | 'lima'

/** Paleta de acentos neón: LEDs del ratón e interfaz comparten el mismo color. */
export const ACENTOS: Record<Acento, { nombre: string; hex: string; suave: string }> = {
  cyan: { nombre: 'Cyan Nova', hex: '#00e5ff', suave: 'rgba(0, 229, 255, 0.14)' },
  purpura: { nombre: 'Púrpura Plasma', hex: '#a855f7', suave: 'rgba(168, 85, 247, 0.16)' },
  lima: { nombre: 'Lima Reactor', hex: '#a3e635', suave: 'rgba(163, 230, 53, 0.14)' },
}

type Estado = {
  /** Nivel de explosión pedido por el scroll o por los controles (0..1). */
  objetivoExplosion: number
  /** Color de acento activo (LEDs e interfaz). */
  acento: Acento
  /** Tarjeta de hotspot abierta, o null. */
  hotspotActivo: string | null
  /** La intro de entrada ya terminó. */
  introCompleta: boolean
  /** El sistema pide movimiento reducido. */
  reducido: boolean
  definirObjetivo: (valor: number) => void
  definirAcento: (acento: Acento) => void
  abrirHotspot: (id: string) => void
  alternarHotspot: (id: string) => void
  cerrarHotspot: () => void
  completarIntro: () => void
  definirReducido: (reducido: boolean) => void
}

export const useUsoTienda = create<Estado>((set) => ({
  objetivoExplosion: 0,
  acento: 'cyan',
  hotspotActivo: null,
  introCompleta: false,
  reducido: false,
  definirObjetivo: (valor) => set({ objetivoExplosion: acotar(valor, 0, 1) }),
  definirAcento: (acento) => set({ acento }),
  abrirHotspot: (id) => set({ hotspotActivo: id }),
  alternarHotspot: (id) =>
    set((estado) => ({ hotspotActivo: estado.hotspotActivo === id ? null : id })),
  cerrarHotspot: () => set({ hotspotActivo: null }),
  completarIntro: () => set({ introCompleta: true }),
  definirReducido: (reducido) => set({ reducido }),
}))

/** Hex del acento activo (atajo para escena y estilos). */
export function hexAcento(acento: Acento): string {
  return ACENTOS[acento].hex
}

// Puente de depuración (solo en desarrollo y con DOM: los tests corren en
// node, donde `window` no existe).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__voltaTienda = useUsoTienda
}
