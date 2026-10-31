import { SensitivityChart } from '../../charts/SensitivityChart'
import { Callout, Card, NumberField, Row, StatTile, StatusBadge } from '../../components/ui'
import { fmtMoney, fmtPct, fmtRate } from '../../engine/format'
import type { AppStore } from '../../state/store'

export function FondeoView({ store }: { store: AppStore }) {
  const { state, results, actions } = store
  const f = results.fondeo
  const fi = state.fondeo

  return (
    <div className="stack">
      <div>
        <h2 className="view-title">Control del fondeo: ¿me alcanzan los USD para girar?</h2>
        <p className="view-lead">
          Compara los USD que necesitas en Tower (modo A de la Calculadora) con los USD que realmente recibes al vender los
          USDT. El precio real cambia un poco en cada operación.
        </p>
      </div>

      <div className="grid-3">
        <StatTile label="USD que necesitas en Tower" value={fmtMoney(f.usdNeeded, 'USD')} sub="Giro + comisiones de Tower + colchón" accent="var(--step-usd)" />
        <StatTile label="USD que recibes realmente" value={fmtMoney(f.usdReceived, 'USD')} sub={`${fmtMoney(fi.usdtBought, 'USDT')} × ${fmtRate(fi.realPrice)} − fee`} accent="var(--step-usdt)" />
        <div className="tile" style={{ ['--tile-accent' as string]: f.ok ? 'var(--good)' : 'var(--critical)' }}>
          <span className="tile__label">Diferencia</span>
          <span className={`tile__value tabular ${f.ok ? 'tone-good' : 'tone-bad'}`}>{fmtMoney(f.diff, 'USD')}</span>
          <StatusBadge kind={f.ok ? 'good' : 'bad'}>
            {f.ok ? `OK: te alcanza, sobran ${fmtMoney(f.diff, 'USD')}` : `FALTAN ${fmtMoney(-f.diff, 'USD')}: no alcanza para girar`}
          </StatusBadge>
        </div>
      </div>

      <div className="layout-main">
        <div className="stack">
          <Card title="Plan" subtitle="Viene de la Calculadora, modo A">
            <Row label="USD que necesitas tener en Tower para girar" note="Giro + comisiones de Tower + colchón." value={fmtMoney(f.usdNeeded, 'USD')} emphasis />
            <Row label="USDT a comprar según el plan" value={fmtMoney(f.usdtPlan, 'USDT')} />
            <Row label="Precio de venta del plan" value={`${fmtRate(f.planPrice)} USD/USDT`} />
            <NumberField
              label="Margen de seguridad sobre los USDT"
              value={fi.marginPct}
              percent
              unit="%"
              min={0}
              onChange={(v) => v !== null && actions.setFondeo({ marginPct: v })}
              hint="Un colchón por si el precio real sale más bajo."
            />
            <Row label="USDT a comprar CON margen" value={fmtMoney(f.usdtWithMargin, 'USDT')} emphasis />
            <Row label="Bs extra que cuesta el margen" note="Lo que pagas de más para asegurar el fondeo." value={fmtMoney(f.extraBob, 'BOB')} />
          </Card>
        </div>
        <div className="stack">
          <Card title="Lo que realmente pasó" subtitle="Llénalo después de operar" tone="editable">
            <div className="grid-3">
              <NumberField
                label="USDT que compraste"
                value={fi.usdtBought}
                unit="USDT"
                min={0}
                compact
                onChange={(v) => v !== null && actions.setFondeo({ usdtBought: v })}
              />
              <NumberField
                label="Precio real de venta"
                value={fi.realPrice}
                decimals={4}
                unit="USD/USDT"
                min={0.0001}
                compact
                onChange={(v) => v !== null && actions.setFondeo({ realPrice: v })}
              />
              <NumberField
                label="Comisión / fee real"
                value={fi.realFee}
                unit="USD"
                min={0}
                compact
                onChange={(v) => v !== null && actions.setFondeo({ realFee: v })}
                hint="Si no cobraron nada, déjalo en 0."
              />
            </div>
            <Row label="USD que recibes realmente" value={fmtMoney(f.usdReceived, 'USD')} emphasis />
            <Row label="Diferencia contra lo que necesitas" note="Positivo = te sobran USD. Negativo = te faltan." value={fmtMoney(f.diff, 'USD')} tone={f.ok ? 'good' : 'bad'} />
            {!f.ok && (
              <Callout kind="bad">
                <b>USDT que faltan para cubrirlo: {fmtMoney(f.usdtMissing, 'USDT')}.</b> Cuántos USDT más tendrías que vender al
                mismo precio real.
              </Callout>
            )}
            {f.ok && <Callout kind="good">Con lo que recibiste alcanza para el giro, las comisiones de Tower y el colchón.</Callout>}
          </Card>
        </div>
      </div>

      <Card
        title="Qué pasa si el precio de venta cambia"
        subtitle={`Diferencia contra los ${fmtMoney(f.usdNeeded, 'USD')} que necesitas, con el plan y con margen del ${fmtPct(f.marginPct)}`}
      >
        <SensitivityChart rows={f.sensitivity} />
        <div className="data-table-wrap">
          <table className="data-table tabular">
            <thead>
              <tr>
                <th>Cambio del precio</th>
                <th>Precio de venta</th>
                <th>USD recibidos (plan)</th>
                <th>Diferencia (plan)</th>
                <th>USD recibidos (con margen)</th>
                <th>Diferencia (con margen)</th>
              </tr>
            </thead>
            <tbody>
              {f.sensitivity.map((s) => (
                <tr key={s.delta} className={s.delta === 0 ? 'is-emphasis' : ''}>
                  <td>{fmtPct(s.delta, 2, true)}</td>
                  <td>{fmtRate(s.price)}</td>
                  <td>{fmtMoney(s.usdPlan)}</td>
                  <td className={s.diffPlan >= 0 ? 'is-good' : 'is-bad'}>{fmtMoney(s.diffPlan)}</td>
                  <td>{fmtMoney(s.usdMargin)}</td>
                  <td className={s.diffMargin >= 0 ? 'is-good' : 'is-bad'}>{fmtMoney(s.diffMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
          Verde = alcanza (sobran USD). Rojo = faltan USD. Si el precio real baja, el plan sin margen se queda corto antes que el
          plan con margen.
        </p>
      </Card>
    </div>
  )
}
