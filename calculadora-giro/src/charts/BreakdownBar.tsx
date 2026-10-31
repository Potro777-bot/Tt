import { useMemo, useState } from 'react'
import { fmtMoney, fmtPct } from '../engine/format'
import { useMeasure } from './useMeasure'
import { ChartTooltip, TipRow, type TipState } from './shared'
import './charts.css'

/**
 * Barra segmentada ALTA: un todo (lo que paga el cliente) partido en ≤ 6 partes.
 *
 * Forma (choosing-a-form.md · "Part-to-whole – which bar"): el lector quiere ver de un
 * vistazo cómo se reparte el total, no comparar partes cercanas entre sí → barra
 * segmentada alta (28 px), cada parte su propio bloque con esquinas de 4 px y 2 px de
 * superficie entre bloques; sin línea base, así que ningún extremo es cuadrado.
 * El giro pesa ~97 % y las comisiones 1–2 %: los bloques diminutos se garantizan a
 * ≥ 2 px (visibles) y no llevan texto; la leyenda y el tooltip cargan sus cifras.
 * La leyenda lista los nombres en orden de bloque; aquí sí repite valor y porcentaje
 * porque los bloques son demasiado estrechos para imprimirlos dentro.
 */
export interface BreakdownPart {
  key: string
  label: string
  value: number
  /** Color del bloque: token CSS (`var(--series-1)`) o hex. */
  color: string
}

export interface BreakdownBarProps {
  parts: BreakdownPart[]
  total: number
  totalLabel: string
}

const BAR_H = 28
const GAP = 2
const MIN_W = 2
const RADIUS = 4
const LABEL_PAD = 12
const CHAR_W = 7
const HIT_MIN = 24

/** Tinta de la etiqueta dentro del relleno: casi negro sobre amarillo/warning, blanco en el resto. */
function labelInk(color: string): 'light' | 'dark' {
  const c = color.trim().toLowerCase()
  if (/series-4|warning|step-yellow/.test(c)) return 'dark'
  const hex = c.match(/^#([0-9a-f]{6})$/)
  if (hex) {
    const v = parseInt(hex[1], 16)
    const lin = (u: number) => {
      const s = u / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    const lum = 0.2126 * lin(v >> 16) + 0.7152 * lin((v >> 8) & 255) + 0.0722 * lin(v & 255)
    return lum > 0.4 ? 'dark' : 'light'
  }
  return 'light'
}

export function BreakdownBar({ parts, total, totalLabel }: BreakdownBarProps) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const [active, setActive] = useState<string | null>(null)
  const [tip, setTip] = useState<TipState | null>(null)

  const visible = useMemo(() => parts.filter((p) => p.value > 0), [parts])
  const sum = visible.reduce((s, p) => s + p.value, 0)
  const base = total > 0 ? total : sum

  // Anchos: proporcionales al valor, con mínimo de 2 px; el exceso se descuenta del bloque mayor.
  const blocks = useMemo(() => {
    const n = visible.length
    if (n === 0 || base <= 0) return []
    const avail = Math.max(0, width - GAP * (n - 1))
    const raw = visible.map((p) => (p.value / base) * avail)
    const widths = raw.map((w) => Math.max(MIN_W, w))
    const excess = widths.reduce((s, w) => s + w, 0) - Math.min(avail, raw.reduce((s, w) => s + w, 0))
    if (excess > 0) {
      const iMax = widths.indexOf(Math.max(...widths))
      widths[iMax] = Math.max(MIN_W, widths[iMax] - excess)
    }
    let x = 0
    const placed = visible.map((p, i) => {
      const w = widths[i]
      const share = p.value / base
      const shareLabel = fmtPct(share, 0)
      const fits = w >= shareLabel.length * CHAR_W + LABEL_PAD
      const b = { ...p, x, w, share, shareLabel, fits, hitL: 0, hitR: 0 }
      x += w + GAP
      return b
    })
    // Zonas de impacto contiguas (nunca se tapan entre sí): parten en la mitad del hueco
    // y cada bloque estrecho toma sitio de un vecino ancho hasta llegar a ≥ 24 px.
    const L = placed.map((b, i) => (i === 0 ? 0 : b.x - GAP / 2))
    const R = placed.map((b, i) => (i === n - 1 ? Math.max(width, b.x + b.w) : b.x + b.w + GAP / 2))
    for (let i = 0; i < n; i++) {
      const need = HIT_MIN - (R[i] - L[i])
      if (need <= 0) continue
      const fromLeft = i > 0 ? Math.min(need / 2, Math.max(0, R[i - 1] - L[i - 1] - HIT_MIN)) : 0
      L[i] -= fromLeft
      if (i > 0) R[i - 1] -= fromLeft
      const fromRight = i < n - 1 ? Math.min(need - fromLeft, Math.max(0, R[i + 1] - L[i + 1] - HIT_MIN)) : 0
      R[i] += fromRight
      if (i < n - 1) L[i + 1] += fromRight
    }
    placed.forEach((b, i) => {
      b.hitL = L[i]
      b.hitR = R[i]
    })
    return placed
  }, [visible, base, width])

  const summary = useMemo(() => {
    if (blocks.length === 0) return `${totalLabel}: sin partes para graficar.`
    const list = blocks.map((b) => `${b.label} ${fmtPct(b.share, 1)} (${fmtMoney(b.value, 'USD')})`).join(', ')
    return `${totalLabel}: ${fmtMoney(base, 'USD')}. Desglose: ${list}.`
  }, [blocks, base, totalLabel])

  const show = (b: (typeof blocks)[number]) => {
    setActive(b.key)
    setTip({
      x: b.x + b.w / 2,
      y: BAR_H + 2,
      content: (
        <>
          <div className="viz-tip__title">{b.label}</div>
          <TipRow color={b.color} value={fmtMoney(b.value, 'USD')} label="monto" />
          <TipRow value={fmtPct(b.share, 2)} label="del total" />
        </>
      ),
    })
  }
  const hide = () => {
    setActive(null)
    setTip(null)
  }

  return (
    <div className="viz" ref={ref}>
      <svg className="viz__svg viz-seg" width={width} height={BAR_H} viewBox={`0 0 ${width} ${BAR_H}`} role="img" aria-label={summary}>
        {blocks.map((b) => (
          <rect
            key={b.key}
            className={active === b.key ? 'viz-seg__block is-active' : 'viz-seg__block'}
            x={b.x}
            y={0}
            width={b.w}
            height={BAR_H}
            rx={Math.min(RADIUS, b.w / 2)}
            fill={b.color}
          />
        ))}
        {blocks.map((b) =>
          b.fits ? (
            <text
              key={`lbl-${b.key}`}
              className={`viz-seg__label viz-seg__label--${labelInk(b.color)}`}
              x={b.x + LABEL_PAD / 2}
              y={BAR_H / 2}
              dy="0.35em"
            >
              {b.shareLabel}
            </text>
          ) : null,
        )}
        {/* Zonas de impacto (más grandes que la marca, sin solaparse); enfocables con teclado */}
        {blocks.map((b) => {
          return (
            <rect
              key={`hit-${b.key}`}
              className="viz-seg__hit viz-seg__block"
              x={b.hitL}
              y={0}
              width={Math.max(0, b.hitR - b.hitL)}
              height={BAR_H}
              rx={RADIUS}
              tabIndex={0}
              role="graphics-symbol"
              aria-label={`${b.label}: ${fmtMoney(b.value, 'USD')}, ${fmtPct(b.share, 2)} del total`}
              onPointerEnter={() => show(b)}
              onPointerLeave={hide}
              onFocus={() => show(b)}
              onBlur={hide}
            />
          )
        })}
      </svg>
      <ChartTooltip tip={tip} width={width} height={BAR_H} />
      <ul className="viz-legend viz-legend--bottom">
        {blocks.map((b) => (
          <li key={b.key} className="viz-legend__item">
            <span className="viz-legend__swatch" style={{ background: b.color }} aria-hidden="true" />
            <span className="viz-legend__name">{b.label}</span>
            <span className="viz-legend__num">{fmtMoney(b.value, 'USD')}</span>
            <span className="viz-legend__muted">{fmtPct(b.share, 1)}</span>
          </li>
        ))}
      </ul>
      <div className="viz-seg__total">
        <span>{totalLabel}</span>
        <span className="viz-legend__num">{fmtMoney(base, 'USD')}</span>
      </div>
    </div>
  )
}
