import { BreakdownBar } from '../../charts/BreakdownBar'
import { Card, Segmented, StatTile, StatusBadge } from '../../components/ui'
import { fmtMoney, fmtPct } from '../../engine/format'
import type { GiroResult } from '../../engine/types'
import type { AppStore } from '../../state/store'
import './resumen.css'

interface Line {
  label: string
  value: (r: GiroResult) => number
  pct?: boolean
  emphasis?: boolean
  signed?: boolean
}

const LINES: Line[] = [
  { label: 'Lo que recibe el beneficiario (el giro)', value: (r) => r.giro },
  { label: 'Comisiones de Tower Bank (SWIFT, TRE, corresponsal, ITBMS)', value: (r) => r.fees.total, pct: true },
  { label: 'Colchón que retiene Tower Bank', value: (r) => r.cushion, pct: true },
  { label: 'Tu comisión extra', value: (r) => r.myFee, pct: true },
  { label: 'Otros (sobrante, comisión de venta si hubiera)', value: (r) => otros(r), pct: true },
  { label: 'El cliente debe entregar (USD) = giro + todo lo anterior', value: (r) => r.clientUsd, pct: true, emphasis: true },
  { label: 'TOTAL cobrado encima del giro', value: (r) => r.clientUsd - r.giro, pct: true, emphasis: true },
  { label: '+ Ganancia (o pérdida) por vender los USDT a USD', value: (r) => r.usdtGain, pct: true, signed: true },
  { label: 'TOTAL + ganancia USDT → USD', value: (r) => r.clientUsd - r.giro + r.usdtGain, pct: true },
  { label: 'Tu ganancia total: tu comisión + ganancia USDT → USD', value: (r) => r.myFee + r.usdtGain, pct: true, emphasis: true },
]

function otros(r: GiroResult) {
  return Math.round((r.clientUsd - r.giro - r.fees.total - r.cushion - r.myFee) * 1e4) / 1e4
}

export function ResumenView({ store }: { store: AppStore }) {
  const { results, state, actions } = store
  const { A, B } = results
  const cur = state.mode === 'A' ? A : B

  const parts = [
    { key: 'giro', label: 'Giro (beneficiario)', value: cur.giro, color: 'var(--series-1)' },
    { key: 'tower', label: 'Comisiones Tower', value: cur.fees.total, color: 'var(--series-2)' },
    { key: 'cushion', label: 'Colchón Tower', value: cur.cushion, color: 'var(--series-3)' },
    { key: 'mine', label: 'Tu comisión', value: cur.myFee, color: 'var(--series-4)' },
    { key: 'otros', label: 'Otros', value: Math.max(0, otros(cur)), color: 'var(--series-7)' },
  ]

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 className="view-title">Resumen del giro, en palabras simples</h2>
          <p className="view-lead">
            Aquí no se escribe nada: todo viene de la Calculadora. Modo A = quiero entregar X; modo B = tengo X Bs.
          </p>
        </div>
        <Segmented
          ariaLabel="Modo a destacar"
          value={state.mode}
          onChange={actions.setMode}
          options={[
            { value: 'A', label: 'Modo A' },
            { value: 'B', label: 'Modo B' },
          ]}
        />
      </div>

      <div className="grid-4">
        <StatTile label="El cliente entrega" value={fmtMoney(cur.clientUsd, 'USD')} sub={fmtMoney(cur.clientBob, 'BOB')} accent="var(--step-usd)" />
        <StatTile label="Cobrado encima del giro" value={fmtPct(cur.pctOverGiro)} sub={fmtMoney(cur.clientUsd - cur.giro, 'USD')} accent="var(--series-2)" />
        <StatTile
          label="Tu ganancia total"
          value={fmtMoney(cur.myFee + cur.usdtGain, 'USD')}
          sub={`${fmtPct((cur.myFee + cur.usdtGain) / (cur.giro || 1))} del giro`}
          accent="var(--series-6)"
        />
        <div className="tile tile--status">
          <span className="tile__label">Resultado en Bs</span>
          <StatusBadge kind={cur.winning ? 'good' : 'bad'} large>
            {cur.winning ? 'GANANDO' : 'PERDIENDO'} {fmtPct(Math.abs(cur.profitPctSpent))}
          </StatusBadge>
          <span className="tile__sub">{fmtMoney(cur.profitBob, 'BOB')} sobre lo gastado</span>
        </div>
      </div>

      <Card
        title={`¿A dónde va cada USD que entrega el cliente? (modo ${state.mode})`}
        subtitle="Una sola barra: el giro que llega al beneficiario más todo lo que se cobra encima."
      >
        <BreakdownBar parts={parts} total={cur.clientUsd} totalLabel="El cliente entrega" />
      </Card>

      <Card title="Desglose comparado" subtitle="Ambos modos lado a lado, en USD y como % del giro">
        <div className="data-table-wrap">
          <table className="data-table tabular">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Modo A: USD</th>
                <th>Modo A: % del giro</th>
                <th>Modo B: USD</th>
                <th>Modo B: % del giro</th>
              </tr>
            </thead>
            <tbody>
              {LINES.map((l) => (
                <tr key={l.label} className={l.emphasis ? 'is-emphasis' : ''}>
                  <td>{l.label}</td>
                  <Cell r={A} l={l} />
                  <Cell r={B} l={l} />
                </tr>
              ))}
              <tr>
                <td>El cliente debe entregar (Bs)</td>
                <td>{fmtMoney(A.clientBob, 'BOB')}</td>
                <td>—</td>
                <td>{fmtMoney(B.clientBob, 'BOB')}</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Ganancia o pérdida (Bs)</td>
                <td className={A.winning ? 'is-good' : 'is-bad'}>{fmtMoney(A.profitBob, 'BOB')}</td>
                <td className={A.winning ? 'is-good' : 'is-bad'}>{fmtPct(A.profitPctSpent, 2, true)}</td>
                <td className={B.winning ? 'is-good' : 'is-bad'}>{fmtMoney(B.profitBob, 'BOB')}</td>
                <td className={B.winning ? 'is-good' : 'is-bad'}>{fmtPct(B.profitPctSpent, 2, true)}</td>
              </tr>
              <tr className="is-emphasis">
                <td>Resultado</td>
                <td colSpan={2}>
                  <StatusBadge kind={A.winning ? 'good' : 'bad'}>
                    {A.winning ? 'GANANDO' : 'PERDIENDO'} {fmtPct(Math.abs(A.profitPctSpent))}
                  </StatusBadge>
                </td>
                <td colSpan={2}>
                  <StatusBadge kind={B.winning ? 'good' : 'bad'}>
                    {B.winning ? 'GANANDO' : 'PERDIENDO'} {fmtPct(Math.abs(B.profitPctSpent))}
                  </StatusBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="notes">
          <li>El porcentaje TOTAL es lo que el cliente paga de más sobre el giro: comisiones de Tower + colchón + tu comisión.</li>
          <li>
            La ganancia USDT → USD sale de vender los USDT a un precio distinto de 1,00: USDT comprados × (precio de venta − 1).
            Va aparte para que no se mezcle con lo que cobras al cliente.
          </li>
          <li>Los Bs que entrega el cliente = USD que entrega × TC del Paso 1. Ganancia o pérdida = lo que cobras en Bs menos lo que gastaste comprando USDT.</li>
        </ul>
      </Card>
    </div>
  )
}

function Cell({ r, l }: { r: GiroResult; l: Line }) {
  const v = l.value(r)
  const cls = l.signed ? (v >= 0 ? 'is-good' : 'is-bad') : ''
  return (
    <>
      <td className={cls}>{fmtMoney(v)}</td>
      <td className={cls}>{l.pct ? fmtPct(r.giro > 0 ? v / r.giro : 0) : '—'}</td>
    </>
  )
}
