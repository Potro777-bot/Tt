import { useState } from 'react'
import { EscalasChart } from '../../charts/EscalasChart'
import { Button, Callout, Card } from '../../components/ui'
import { treCapGiro } from '../../engine/calc'
import { DEFAULT_ESCALAS } from '../../engine/defaults'
import { fmtMoney, fmtPct, fmtRate, parseNumber } from '../../engine/format'
import type { AppStore } from '../../state/store'
import './escalas.css'

export function EscalasView({ store }: { store: AppStore }) {
  const { state, results, actions } = store
  const rows = results.escalas
  const p = state.params
  const [draft, setDraft] = useState('')

  const add = () => {
    const v = parseNumber(draft)
    if (v === null || v <= 0) return
    const next = Array.from(new Set([...state.escalas, v])).sort((a, b) => a - b)
    actions.setEscalas(next)
    setDraft('')
  }
  const remove = (g: number) => {
    if (state.escalas.length <= 2) return
    actions.setEscalas(state.escalas.filter((x) => x !== g))
  }

  const r10k = rows.find((r) => r.giro === p.threshold)
  const r10k1 = rows.find((r) => r.giro > p.threshold && r.giro <= p.threshold * 1.03)

  return (
    <div className="stack">
      <div>
        <h2 className="view-title">Escalas: cuánto cuesta cada tamaño de giro</h2>
        <p className="view-lead">
          Hacia atrás, al TC de compra de la Calculadora ({fmtRate(state.rates.buyRate)} Bs/USDT). Muestra la zona muerta de{' '}
          {fmtMoney(p.threshold, 'USD')} y el punto donde el TRE llega al tope (≈ {fmtMoney(treCapGiro(p), 'USD')}).
        </p>
      </div>

      <Card title="Costo para ti como % del giro" subtitle="Los giros pequeños cargan las comisiones fijas; el salto es el corresponsal al pasar el umbral.">
        <EscalasChart rows={rows} threshold={p.threshold} treCapGiro={treCapGiro(p)} />
        {r10k && r10k1 && (
          <Callout kind="warn">
            Compara {fmtMoney(r10k.giro, 'USD')} con {fmtMoney(r10k1.giro, 'USD')}: las comisiones de Tower pasan de{' '}
            <b>{fmtMoney(r10k.fees, 'USD')}</b> a <b>{fmtMoney(r10k1.fees, 'USD')}</b> por el corresponsal. Un giro pegado al
            umbral conviene dejarlo justo por debajo.
          </Callout>
        )}
      </Card>

      <Card
        title="Tabla de escalas"
        subtitle="Los montos de giro son editables: agrega o quita tamaños."
        actions={
          <div className="escalas-add">
            <input
              className="escalas-add__input tabular"
              inputMode="decimal"
              placeholder="Nuevo giro (USD)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              aria-label="Nuevo tamaño de giro en USD"
            />
            <Button variant="primary" onClick={add}>
              Agregar
            </Button>
            <Button variant="subtle" onClick={() => actions.setEscalas(DEFAULT_ESCALAS)} title="Volver a la lista original">
              Restablecer
            </Button>
          </div>
        }
      >
        <div className="data-table-wrap">
          <table className="data-table tabular">
            <thead>
              <tr>
                <th>Giro neto (USD)</th>
                <th>Comisiones Tower</th>
                <th>USD requeridos en Tower</th>
                <th>USDT comprados</th>
                <th>Costo total (USD)</th>
                <th>BOB necesarios</th>
                <th>TC efectivo</th>
                <th>Costo % del giro</th>
                <th>Comisión extra</th>
                <th>Cliente entrega (USD)</th>
                <th>Cliente entrega (BOB)</th>
                <th>Ganancia % sobre lo gastado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.giro} className={r.nearThreshold ? 'is-highlight' : ''}>
                  <td>
                    <b>{fmtMoney(r.giro)}</b>
                  </td>
                  <td>{fmtMoney(r.fees)}</td>
                  <td>{fmtMoney(r.usdRequired)}</td>
                  <td>{fmtMoney(r.usdt)}</td>
                  <td>{fmtMoney(r.costUsd)}</td>
                  <td>{fmtMoney(r.bob)}</td>
                  <td>{fmtRate(r.effectiveRate)}</td>
                  <td>{fmtPct(r.costPct)}</td>
                  <td>{fmtMoney(r.myFee)}</td>
                  <td>{fmtMoney(r.clientUsd)}</td>
                  <td>{fmtMoney(r.clientBob)}</td>
                  <td className={r.gainPct >= 0 ? 'is-good' : 'is-bad'}>{fmtPct(r.gainPct)}</td>
                  <td>
                    <button className="row-remove" onClick={() => remove(r.giro)} aria-label={`Quitar giro de ${fmtMoney(r.giro)} USD`} title="Quitar">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
          Resaltado amarillo: los giros pegados al umbral. El TRE llega a su tope de {fmtMoney(p.treCap, 'USD')} con un giro de ≈{' '}
          {fmtMoney(treCapGiro(p))} USD.
        </p>
      </Card>
    </div>
  )
}
