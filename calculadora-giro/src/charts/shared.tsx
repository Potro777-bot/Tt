import type { ReactNode } from 'react'

/* ── Utilidades compartidas por los gráficos (sin dependencias) ─── */

/** Ancho aproximado de un texto en px (≈0,6 em por carácter en una sans del sistema). */
export const textW = (s: string, fontSize = 11) => s.length * fontSize * 0.6

/** Ticks "bonitos" (1·2·5 × 10^n) que cubren [min, max] con ~count divisiones. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0]
  if (min === max) {
    if (min === 0) return [0, 1]
    min = Math.min(0, min)
    max = Math.max(0, max)
  }
  const raw = (max - min) / Math.max(1, count)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v)
  return ticks
}

/**
 * Columna con 4 px redondeados en el extremo de dato y cuadrada en la línea base.
 * Funciona hacia arriba (yEnd < yBase) o hacia abajo (yEnd > yBase). Altura 0 → nada.
 */
export function barPath(x: number, w: number, yBase: number, yEnd: number, radius = 4): string {
  const h = Math.abs(yBase - yEnd)
  // Menos de medio píxel no se dibuja (evita trazos degenerados con valores ≈ 0).
  if (h < 0.5 || w <= 0) return ''
  const r = Math.min(radius, h, w / 2)
  const x2 = x + w
  if (yEnd < yBase) {
    // crece hacia arriba
    return [
      `M${x},${yBase}`,
      `L${x},${yEnd + r}`,
      `A${r},${r} 0 0 1 ${x + r},${yEnd}`,
      `L${x2 - r},${yEnd}`,
      `A${r},${r} 0 0 1 ${x2},${yEnd + r}`,
      `L${x2},${yBase}`,
      'Z',
    ].join(' ')
  }
  // crece hacia abajo
  return [
    `M${x},${yBase}`,
    `L${x},${yEnd - r}`,
    `A${r},${r} 0 0 0 ${x + r},${yEnd}`,
    `L${x2 - r},${yEnd}`,
    `A${r},${r} 0 0 0 ${x2},${yEnd - r}`,
    `L${x2},${yBase}`,
    'Z',
  ].join(' ')
}

/** Cada cuántas etiquetas mostrar para que no se pisen en un eje ordinal. */
export function labelStep(maxLabelW: number, slotW: number): number {
  return Math.max(1, Math.ceil((maxLabelW + 8) / Math.max(1, slotW)))
}

/* ── Tooltip ──────────────────────────────────────────── */

export interface TipState {
  /** Posición en px dentro del contenedor del gráfico. */
  x: number
  y: number
  content: ReactNode
}

/**
 * Tooltip HTML posicionado de forma absoluta dentro de un contenedor `position: relative`.
 * Se voltea al lado izquierdo del puntero cuando está en la mitad derecha y hacia arriba
 * cuando está en la mitad inferior, así nunca desborda el contenedor.
 */
export function ChartTooltip({ tip, width, height }: { tip: TipState | null; width: number; height: number }) {
  if (!tip) return null
  const flipX = tip.x > width / 2
  const flipY = tip.y > height / 2
  const style: React.CSSProperties = {
    top: flipY ? tip.y - 10 : tip.y + 10,
    transform: flipY ? 'translateY(-100%)' : undefined,
    ...(flipX ? { right: Math.max(0, width - tip.x + 10) } : { left: Math.max(0, tip.x + 10) }),
    maxWidth: Math.max(140, (flipX ? tip.x : width - tip.x) - 12),
  }
  return (
    <div className="viz-tip" role="presentation" style={style}>
      {tip.content}
    </div>
  )
}

/** Fila de tooltip: el valor manda, la etiqueta acompaña; la clave es un trazo corto del color de serie. */
export function TipRow({ value, label, color }: { value: ReactNode; label?: ReactNode; color?: string }) {
  return (
    <div className="viz-tip__row">
      {color && <span className="viz-tip__key" style={{ background: color }} aria-hidden="true" />}
      <span className="viz-tip__val">{value}</span>
      {label && <span className="viz-tip__lbl">{label}</span>}
    </div>
  )
}
