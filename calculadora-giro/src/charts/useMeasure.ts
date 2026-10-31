import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

// En el servidor (renderToStaticMarkup) no hay layout: usamos useEffect para evitar avisos.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Mide el ancho del contenedor con ResizeObserver.
 * - Sin DOM / sin ResizeObserver (tests en node) devuelve `initial` y no observa nada.
 * - El ancho se redondea a px enteros para que el SVG (viewBox = px) quede nítido.
 */
export function useMeasure<T extends HTMLElement = HTMLDivElement>(
  initial = 640,
): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : Math.round(w)))
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}
