import { beforeEach, describe, expect, it } from 'vitest'
import { useUsoTienda } from './usoTienda'

describe('tienda de estado', () => {
  beforeEach(() => {
    useUsoTienda.setState({ objetivoExplosion: 0, acento: 'cyan', hotspotActivo: null })
  })

  it('acota el objetivo de explosión a 0..1', () => {
    useUsoTienda.getState().definirObjetivo(1.7)
    expect(useUsoTienda.getState().objetivoExplosion).toBe(1)
    useUsoTienda.getState().definirObjetivo(-0.4)
    expect(useUsoTienda.getState().objetivoExplosion).toBe(0)
  })

  it('alterna la tarjeta de hotspot activa', () => {
    const { alternarHotspot } = useUsoTienda.getState()
    alternarHotspot('pcb')
    expect(useUsoTienda.getState().hotspotActivo).toBe('pcb')
    alternarHotspot('pcb')
    expect(useUsoTienda.getState().hotspotActivo).toBeNull()
  })

  it('cambia el acento activo', () => {
    useUsoTienda.getState().definirAcento('lima')
    expect(useUsoTienda.getState().acento).toBe('lima')
  })
})
