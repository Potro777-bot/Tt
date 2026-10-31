import { useMemo, useState } from 'react'
import type { SensitivityRow } from '../engine/types'
import { fmtMoney, fmtNumber, fmtPct, fmtRate } from '../engine/format'
import { useMeasure } from './useMeasure'
import { ChartTooltip, TipRow, barPath, labelStep, niceTicks, textW, type TipState } from './shared'
import './charts.css'

/**
 * Sensibilidad al precio de venta: ¿sobran o faltan USD frente a lo necesario?
 *
 * Forma: columnas agrupadas alrededor de una línea base en cero (choosing-a-form.md:
 * "por encima / por debajo de una línea base" + "distinguir series → categórico").
 * Dos series con identidad fija — Plan = series-1, Con margen = series-2 — nunca
 * good/bad por signo: el signo lo dice la posición respecto al cero y el texto del
 * tooltip ("sobran" / "faltan"). Leyenda siempre presente (2 series).
 */
export interface SensitivityChartProps {
  rows: SensitivityRow[]
}

const H = 240
const M = { top: 10, right: 12, bottom: 26, left: 48 }
const SERIES = [
  { key: 'plan', name: 'Plan', color: 'var(--series-1)' },
  { key: 'margin', name: 'Con margen', color: 'var(--series-2)' },
] as const

const diffWord = (d: number) =>
  Math.abs(d) < 0.005 ? 'exacto' : d > 0 ? `sobran ${fmtMoney(d, 'USD')}` : `faltan ${fmtMoney(-d, 'USD')}`

export function SensitivityChart({ rows }: SensitivityChartProps) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const [tip, setTip] = useState<TipState | null>(null)

  const n = rows.length
  const plotW = Math.max(40, width - M.left - M.right)
  const plotH = H - M.top - M.bottom
  const slot = n > 0 ? plotW / n : plotW
  const barW = Math.max(3, Math.min(24, Math.floor((slot * 0.72 - 2) / 2)))
  const groupW = barW * 2 + 2

  const values = rows.flatMap((r) => [r.diffPlan, r.diffMargin])
  const lo = Math.min(0, ...values)
  const hi = Math.max(0, ...values)
  const ticks = niceTicks(lo, hi, 4)
  const yMin = ticks[0]
  const yMax = ticks[ticks.length - 1]
  const span = yMax - yMin || 1
  const y = (v: number) => M.top + plotH - ((v - yMin) / span) * plotH
  const y0 = y(0)
  const cx = (i: number) => M.left + slot * (i + 0.5)

  const xLabels = rows.map((r) => fmtPct(r.delta, 2, true))
  const step = labelStep(Math.max(...xLabels.map((s) => textW(s)), 0), slot)

  const summary = useMemo(() => {
    if (n === 0) return 'Sin datos de sensibilidad.'
    const first = rows[0]
    const last = rows[n - 1]
    return (
      `Sensibilidad al precio de venta, de ${fmtPct(first.delta, 2, true)} a ${fmtPct(last.delta, 2, true)}. ` +
      `Plan: ${diffWord(first.diffPlan)} en el peor caso y ${diffWord(last.diffPlan)} en el mejor. ` +
      `Con margen: ${diffWord(first.diffMargin)} en el peor caso y ${diffWord(last.diffMargin)} en el mejor.`
    )
  }, [rows, n])

  const show = (i: number) => {
    const r = rows[i]
    setActive(i)
    setTip({
      x: cx(i),
      y: y(Math.max(r.diffPlan, r.diffMargin, 0)),
      content: (
        <>
          <div className="viz-tip__title">
            Precio de venta {fmtRate(r.price)} · {fmtPct(r.delta, 2, true)}
          </div>
          <TipRow color={SERIES[0].color} value={fmtMoney(r.usdPlan, 'USD')} label="recibes · Plan" />
          <TipRow value={diffWord(r.diffPlan)} label="vs. necesario" />
          <TipRow color={SERIES[1].color} value={fmtMoney(r.usdMargin, 'USD')} label="recibes · Con margen" />
          <TipRow value={diffWord(r.diffMargin)} label="vs. necesario" />
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
      <ul className="viz-legend viz-legend--top" aria-hidden="true">
        {SERIES.map((s) => (
          <li key={s.key} className="viz-legend__item">
            <span className="viz-legend__swatch" style={{ background: s.color }} />
            <span className="viz-legend__name">{s.name}</span>
          </li>
        ))}
      </ul>
      <svg className="viz__svg" width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={summary}>
        {/* Rejilla + eje Y (la línea cero en color de eje, el resto en rejilla) */}
        {ticks.map((t) => (
          <g key={t}>
            {t !== 0 && <line className="viz-grid" x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} />}
            <text className="viz-axis" x={M.left - 8} y={y(t)} dy="0.35em" textAnchor="end">
              {fmtNumber(t, 0)}
            </text>
          </g>
        ))}

        {/* Zonas de impacto por grupo */}
        {rows.map((r, i) => (
          <rect
            key={`hit-${i}`}
            className="viz-hit"
            x={M.left + slot * i}
            y={M.top}
            width={slot}
            height={plotH}
            rx={4}
            tabIndex={0}
            aria-label={`Precio ${fmtRate(r.price)} (${fmtPct(r.delta, 2, true)}): Plan ${diffWord(r.diffPlan)}; con margen ${diffWord(r.diffMargin)}`}
            onPointerEnter={() => show(i)}
            onPointerLeave={hide}
            onFocus={() => show(i)}
            onBlur={hide}
          />
        ))}

        {/* Columnas agrupadas, 2 px de superficie entre las dos */}
        {rows.map((r, i) => {
          const x0 = cx(i) - groupW / 2
          const dPlan = barPath(x0, barW, y0, y(r.diffPlan))
          const dMargin = barPath(x0 + barW + 2, barW, y0, y(r.diffMargin))
          const cls = active === i ? 'viz-bar is-active' : 'viz-bar'
          return (
            <g key={`bars-${i}`}>
              {dPlan && <path className={cls} d={dPlan} fill={SERIES[0].color} />}
              {dMargin && <path className={cls} d={dMargin} fill={SERIES[1].color} />}
            </g>
          )
        })}

        {/* Línea base cero por encima de las columnas para que siempre se lea */}
        <line className="viz-baseline" x1={M.left} x2={M.left + plotW} y1={y0} y2={y0} />

        {/* Eje X */}
        {rows.map((_, i) =>
          i % step === 0 ? (
            <text key={`x-${i}`} className="viz-axis" x={cx(i)} y={M.top + plotH + 16} textAnchor="middle">
              {xLabels[i]}
            </text>
          ) : null,
        )}
        {n === 0 && (
          <text className="viz-axis" x={M.left + plotW / 2} y={M.top + plotH / 2} textAnchor="middle">
            Sin datos
          </text>
        )}
      </svg>
      <ChartTooltip tip={tip} width={width} height={H} />
    </div>
  )
}
