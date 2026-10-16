import { describe, expect, it } from 'vitest'
import { acotar, escalonSuave, esponjar, facil, mezclar, progresoPorRetardo } from './mates'

describe('mates', () => {
  it('acotar limita a los extremos', () => {
    expect(acotar(-1, 0, 1)).toBe(0)
    expect(acotar(2, 0, 1)).toBe(1)
    expect(acotar(0.4, 0, 1)).toBe(0.4)
  })

  it('mezclar interpola linealmente', () => {
    expect(mezclar(0, 10, 0.5)).toBe(5)
    expect(mezclar(4, 8, 0)).toBe(4)
  })

  it('esponjar converge hacia el objetivo', () => {
    let valor = 0
    for (let i = 0; i < 240; i++) valor = esponjar(valor, 1, 5, 1 / 60)
    expect(valor).toBeGreaterThan(0.99)
  })

  it('escalonSuave tiene extremos redondeados y simetría', () => {
    expect(escalonSuave(0)).toBe(0)
    expect(escalonSuave(1)).toBe(1)
    expect(escalonSuave(0.5)).toBeCloseTo(0.5, 5)
  })

  it('facil arranca rápido y termina en 1', () => {
    expect(facil(0)).toBe(0)
    expect(facil(1)).toBe(1)
    expect(facil(0.5)).toBeGreaterThan(0.5)
  })

  it('progresoPorRetardo reparte el rango de la explosión', () => {
    expect(progresoPorRetardo(0, 0.5)).toBe(0)
    expect(progresoPorRetardo(1, 0)).toBe(1)
    expect(progresoPorRetardo(0.5, 0.5)).toBe(0)
    expect(progresoPorRetardo(1, 0.5)).toBe(1)
    expect(progresoPorRetardo(0.75, 0.5)).toBeCloseTo(0.5, 5)
  })
})
