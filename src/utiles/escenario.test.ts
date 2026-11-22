import { describe, expect, it } from 'vitest'
import { centroEscenario } from './escenario'

describe('centroEscenario', () => {
  it('centra el escenario en la ventana por debajo de 60rem', () => {
    expect(centroEscenario(390)).toBe(195)
  })

  it('lo lleva al centro de las columnas 6 a 12 en escritorio', () => {
    expect(centroEscenario(1440)).toBe(1000)
  })

  it('mantiene la rejilla centrada a 1920', () => {
    expect(centroEscenario(1920)).toBe(1240)
  })
})
