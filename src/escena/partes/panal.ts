import { CanvasTexture, RepeatWrapping, type Texture } from 'three'

/**
 * Textura procedural de panal de abeja para el bumpMap de la carcasa.
 *
 * Se dibuja en un canvas 2D (líneas claras sobre negro): al usarse como
 * bumpMap, el interior de cada celda hexagonal queda "inflado" y las
 * aristas atrapan la luz — el efecto de panal sin modelar cientos de
 * hexágonos. No depende de assets externos.
 */
export function crearTexturaPanal(tamano = 512, repeticion = 3): Texture {
  const lienzo = document.createElement('canvas')
  lienzo.width = tamano
  lienzo.height = tamano
  const ctx = lienzo.getContext('2d')

  if (ctx) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, tamano, tamano)

    const radio = tamano / 11
    const alto = Math.sqrt(3) * radio
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = tamano / 140
    ctx.beginPath()

    // Rejilla hexagonal "flat-top": columnas separadas 1.5·r y desplazadas
    // media celda en vertical las impares.
    for (let col = -1; col * 1.5 * radio < tamano + radio * 2; col++) {
      for (let fila = -1; fila * alto < tamano + alto * 2; fila++) {
        const cx = col * 1.5 * radio
        const cy = fila * alto + (col % 2 ? alto / 2 : 0)
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i
          const x = cx + radio * Math.cos(ang)
          const y = cy + radio * Math.sin(ang)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
      }
    }
    ctx.stroke()
  }

  const textura = new CanvasTexture(lienzo)
  textura.wrapS = RepeatWrapping
  textura.wrapT = RepeatWrapping
  textura.repeat.set(repeticion, repeticion)
  return textura
}
