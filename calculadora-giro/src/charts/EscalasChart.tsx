import { useMemo, useState } from 'react'
import type { EscalaRow } from '../engine/types'
import { fmtMoney, fmtNumber, fmtPct } from '../engine/format'
import { useMeasure } from './useMeasure'
import { ChartTooltip, TipRow, barPath, labelStep, niceTicks, textW, type TipState } from './shared'
import './charts.css'

/**
 * Costo para ti (% del giro) por tamaño de giro.
 *
 * Forma elegida: columnas sobre un eje X ORDINAL (una ranura por escala), no una línea
 * sobre un eje logarítmico. Razones (choosing-a-form.md: "comparar magnitud → columna"):
 *  - Las escalas son escenarios discretos que elige el usuario (500, 1.000, …, 100.000),
 *    no una muestra continua: una línea sugeriría interpolar entre ellos.
 *  - El salto del umbral ocurre entre 10.000 y 10.001; en un eje log esos dos puntos
 *    caen en el mismo píxel y la marca/etiqueta se pisan. En ranuras ordinales son
 *    columnas vecinas y el escalón queda legible, reforzado con etiqueta directa
 *    solo en ese par (nunca en todos los puntos).
 *  - Una sola serie → un solo tono (series-1), sin leyenda; el título de la tarjeta nombra la medida.
 * Referencias: hairlines verticales en el límite "umbral" y en el giro donde el TRE toca su tope.
 */
export interface EscalasChartProps {
  rows: EscalaRow[]
  /** Umbral del corresponsal (USD). La comisión sube para giro > umbral. */
  threshold: number
  /** Giro a partir del cual el TRE queda topado (USD). Infinity → sin línea. */
  treCapGiro: number
}

const H = 260
const M = { top: 30, right: 12, bottom: 26, left: 44 }

export function EscalasChart({ rows, threshold, treCapGiro }: EscalasChartProps) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const [tip, setTip] = useState<TipState | null>(null)

  const data = useMemo(() => [...rows].sort((a, b) => a.giro - b.giro), [rows])
  const n = data.length

  const plotW = Math.max(40, width - M.left - M.right)
  const plotH = H - M.top - M.bottom
  const slot = n > 0 ? plotW / n : plotW
  const barW = Math.max(3, Math.min(24, Math.floor(slot * 0.6)))

  const maxPct = data.reduce((m, r) => Math.max(m, r.costPct), 0)
  const ticks = niceTicks(0, maxPct > 0 ? maxPct : 0.01, 4)
  const yMax = ticks[ticks.length - 1] || 1
  const y = (v: number) => M.top + plotH - (v / yMax) * plotH
  const cx = (i: number) => M.left + slot * (i + 0.5)
  const yBase = M.top + plotH

  // Límite entre la última escala ≤ umbral y la primera > umbral.
  const iThr = findBoundary(data, (g) => g <= threshold)
  // Límite entre la última escala < tope y la primera ≥ tope (ahí el TRE deja de crecer).
  const iCap = Number.isFinite(treCapGiro) ? findBoundary(data, (g) => g < treCapGiro) : -1
  const boundaryX = (i: number) => M.left + slot * (i + 1)

  // Etiquetas del eje X: cifras completas, una de cada k para que no se pisen.
  const xLabels = data.map((r) => fmtNumber(r.giro, 0))
  const step = labelStep(Math.max(...xLabels.map((s) => textW(s)), 0), slot)

  const summary = useMemo(() => {
    if (n === 0) return 'Sin escalas para graficar.'
    const first = data[0]
    const last = data[n - 1]
    const parts = [
      `Costo como porcentaje del giro para ${n} tamaños, de ${fmtNumber(first.giro, 0)} a ${fmtNumber(last.giro, 0)} USD: ` +
        `${fmtPct(first.costPct, 2)} en el más pequeño y ${fmtPct(last.costPct, 2)} en el más grande.`,
    ]
    if (iThr >= 0) {
      parts.push(
        `Umbral del corresponsal en USD ${fmtNumber(threshold, 0)}: el costo pasa de ${fmtPct(data[iThr].costPct, 2)} a ${fmtPct(data[iThr + 1].costPct, 2)}.`,
      )
    }
    if (iCap >= 0) parts.push(`El TRE llega a su tope a partir de USD ${fmtNumber(treCapGiro, 0)}.`)
    return parts.join(' ')
  }, [data, n, iThr, iCap, threshold, treCapGiro])

  const show = (i: number) => {
    const r = data[i]
    setActive(i)
    setTip({
      x: cx(i),
      y: Math.min(y(r.costPct), yBase - 4),
      content: (
        <>
          <div className="viz-tip__title">Giro USD {fmtNumber(r.giro, 0)}</div>
          <TipRow value={fmtPct(r.costPct, 2)} label="costo para ti" />
          <TipRow value={fmtMoney(r.costUsd, 'USD')} label="costo" />
          <TipRow value={fmtMoney(r.bob, 'BOB')} label="necesarios" />
          {r.nearThreshold && r.giro > threshold && <div className="viz-tip__note">Justo sobre el umbral</div>}
        </>
      ),
    })
  }
  const hide = () => {
    setActive(null)
    setTip(null)
  }

  const refLabelW = textW('Umbral USD ' + fmtNumber(threshold, 0))

  return (
    <div className="viz" ref={ref}>
      <svg className="viz__svg" width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={summary}>
        {/* Rejilla + eje Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'viz-baseline' : 'viz-grid'} x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} />
            <text className="viz-axis" x={M.left - 8} y={y(t)} dy="0.35em" textAnchor="end">
              {fmtPct(t, 0)}
            </text>
          </g>
        ))}

        {/* Zonas de impacto (debajo de las columnas; la columna no captura el puntero) */}
        {data.map((r, i) => (
          <rect
            key={`hit-${r.giro}-${i}`}
            className="viz-hit"
            x={M.left + slot * i}
            y={M.top}
            width={slot}
            height={plotH}
            rx={4}
            tabIndex={0}
            aria-label={`Giro USD ${fmtNumber(r.giro, 0)}: costo ${fmtPct(r.costPct, 2)}, ${fmtMoney(r.costUsd, 'USD')}, ${fmtMoney(r.bob, 'BOB')} necesarios`}
            onPointerEnter={() => show(i)}
            onPointerLeave={hide}
            onFocus={() => show(i)}
            onBlur={hide}
          />
        ))}

        {/* Columnas */}
        {data.map((r, i) => {
          const d = barPath(cx(i) - barW / 2, barW, yBase, y(r.costPct))
          return d ? (
            <path key={`bar-${r.giro}-${i}`} className={active === i ? 'viz-bar is-active' : 'viz-bar'} d={d} fill="var(--series-1)" />
          ) : null
        })}

        {/* Referencias */}
        {iThr >= 0 && (
          <g>
            <line className="viz-ref" x1={boundaryX(iThr)} x2={boundaryX(iThr)} y1={M.top - 4} y2={yBase} />
            <text
              className="viz-ref__label"
              x={boundaryX(iThr) + (boundaryX(iThr) - M.left > refLabelW + 6 ? -4 : 4)}
              y={M.top - 10}
              textAnchor={boundaryX(iThr) - M.left > refLabelW + 6 ? 'end' : 'start'}
            >
              Umbral USD {fmtNumber(threshold, 0)}
            </text>
            {/* Etiqueta directa solo en el par que flanquea el umbral */}
            <text className="viz-label" x={boundaryX(iThr) - 4} y={y(data[iThr].costPct) - 6} textAnchor="end">
              {fmtPct(data[iThr].costPct, 2)}
            </text>
            <text className="viz-label" x={boundaryX(iThr) + 4} y={y(data[iThr + 1].costPct) - 6} textAnchor="start">
              {fmtPct(data[iThr + 1].costPct, 2)}
            </text>
          </g>
        )}
        {iCap >= 0 && iCap !== iThr && (
          <g>
            <line className="viz-ref" x1={boundaryX(iCap)} x2={boundaryX(iCap)} y1={M.top - 4} y2={yBase} />
            <text
              className="viz-ref__label"
              x={boundaryX(iCap) + (M.left + plotW - boundaryX(iCap) > textW('Tope TRE') + 6 ? 4 : -4)}
              y={M.top - 10}
              textAnchor={M.left + plotW - boundaryX(iCap) > textW('Tope TRE') + 6 ? 'start' : 'end'}
            >
              Tope TRE
            </text>
          </g>
        )}

        {/* Eje X */}
        {data.map((r, i) =>
          i % step === 0 ? (
            <text key={`x-${r.giro}-${i}`} className="viz-axis" x={cx(i)} y={yBase + 16} textAnchor="middle">
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

/** Índice i tal que pred(data[i].giro) y !pred(data[i+1].giro); -1 si no hay límite interior. */
function findBoundary(data: EscalaRow[], pred: (giro: number) => boolean): number {
  for (let i = 0; i < data.length - 1; i++) {
    if (pred(data[i].giro) && !pred(data[i + 1].giro)) return i
  }
  return -1
}
