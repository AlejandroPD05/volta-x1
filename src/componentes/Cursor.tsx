import { useEffect, useRef, useState } from 'react'

/**
 * Cursor personalizado (solo punteros finos).
 *
 * Un punto de acento que sigue al ratón casi pegado y un anillo con más
 * inercia que crece al pasar sobre elementos interactivos. Usa
 * `mix-blend-mode: difference` para invertirse sobre cualquier fondo.
 * En pantallas táctiles no se renderiza nada.
 */
export function Cursor() {
  const punto = useRef<HTMLDivElement>(null)
  const anillo = useRef<HTMLDivElement>(null)
  const [fino] = useState(() => window.matchMedia('(pointer: fine)').matches)

  useEffect(() => {
    if (!fino) return
    const elPunto = punto.current
    const elAnillo = anillo.current
    if (!elPunto || !elAnillo) return

    document.documentElement.classList.add('cursor-propio')

    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let px = x
    let py = y
    let ax = x
    let ay = y
    let raf = 0
    let sobreInteractivo: Element | null = null

    const alMover = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      elPunto.style.opacity = '1'
      elAnillo.style.opacity = '1'
    }

    const alPasar = (e: MouseEvent) => {
      const objetivo = (e.target as Element | null)?.closest('a, button, input, [data-cursor]') ?? null
      if (objetivo !== sobreInteractivo) {
        sobreInteractivo = objetivo
        elAnillo.classList.toggle('cursor-anillo--grande', Boolean(objetivo))
      }
    }

    const alSalir = () => {
      elPunto.style.opacity = '0'
      elAnillo.style.opacity = '0'
    }
    const alEntrar = () => {
      elPunto.style.opacity = '1'
      elAnillo.style.opacity = '1'
    }

    const bucle = () => {
      px += (x - px) * 0.5
      py += (y - py) * 0.5
      ax += (x - ax) * 0.16
      ay += (y - ay) * 0.16
      elPunto.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`
      elAnillo.style.transform = `translate(${ax}px, ${ay}px) translate(-50%, -50%)`
      raf = requestAnimationFrame(bucle)
    }
    raf = requestAnimationFrame(bucle)

    window.addEventListener('mousemove', alMover)
    window.addEventListener('mouseover', alPasar)
    document.documentElement.addEventListener('mouseleave', alSalir)
    document.documentElement.addEventListener('mouseenter', alEntrar)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', alMover)
      window.removeEventListener('mouseover', alPasar)
      document.documentElement.removeEventListener('mouseleave', alSalir)
      document.documentElement.removeEventListener('mouseenter', alEntrar)
      document.documentElement.classList.remove('cursor-propio')
    }
  }, [fino])

  if (!fino) return null

  return (
    <>
      <div ref={anillo} className="cursor-anillo" style={{ opacity: 0 }} aria-hidden="true" />
      <div ref={punto} className="cursor-punto" style={{ opacity: 0 }} aria-hidden="true" />
    </>
  )
}
