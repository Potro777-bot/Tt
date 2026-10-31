import { Button, Callout, Card, NumberField } from '../../components/ui'
import { treCapGiro } from '../../engine/calc'
import { fmtMoney } from '../../engine/format'
import type { RouteParams } from '../../engine/types'
import type { AppStore } from '../../state/store'

type NumKey = keyof RouteParams

interface Def {
  key: NumKey
  label: string
  unit: string
  percent?: boolean
  decimals?: number
  note: string
}

const PLATFORM: Def[] = [
  { key: 'sellFeePct', label: 'Comisión por vender la crypto a USD', unit: '%', percent: true, note: 'En esta ruta no hay comisión de venta. Déjalo en 0 salvo que cambie.' },
  { key: 'networkFee', label: 'Fee de red / retiro', unit: 'USD', note: 'En esta ruta no hay fee de red. Déjalo en 0 salvo que cambie.' },
  { key: 'p2pFeePct', label: 'Comisión Binance P2P', unit: '%', percent: true, note: 'Supuesto: 0 % (compra P2P). Cámbialo si pagas comisión.' },
]

const TOWER: Def[] = [
  { key: 'swiftFee', label: 'Fee SWIFT', unit: 'USD', note: 'Fijo por giro.' },
  { key: 'trePct', label: 'TRE', unit: '%', percent: true, decimals: 3, note: 'Porcentaje del giro (0,125 %).' },
  { key: 'treCap', label: 'Tope del TRE', unit: 'USD', note: 'El TRE deja de crecer al llegar aquí.' },
  { key: 'corrLow', label: 'Corresponsal con giro ≤ umbral', unit: 'USD', note: 'Hasta el umbral.' },
  { key: 'corrHigh', label: 'Corresponsal con giro > umbral', unit: 'USD', note: 'Por encima del umbral.' },
  { key: 'threshold', label: 'Umbral de giro para corresponsal', unit: 'USD', note: 'Zona muerta: al pasar de este monto el corresponsal sube.' },
  { key: 'itbmsPct', label: 'ITBMS sobre comisiones', unit: '%', percent: true, note: 'Se aplica sobre SWIFT + TRE + corresponsal.' },
  { key: 'cushion', label: 'Colchón retenido por Tower', unit: 'USD', note: 'Ponlo en 0 si no quieres contarlo como costo.' },
]

export function ParametrosView({ store }: { store: AppStore }) {
  const { state, actions } = store
  const p = state.params

  const field = (d: Def) => (
    <NumberField
      key={d.key}
      label={d.label}
      value={p[d.key]}
      unit={d.unit}
      percent={d.percent}
      decimals={d.decimals ?? 2}
      min={0}
      compact
      onChange={(v) => v !== null && actions.setParams({ [d.key]: v } as Partial<RouteParams>)}
      hint={d.note}
    />
  )

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 className="view-title">Parámetros de la ruta</h2>
          <p className="view-lead">
            BOB → USDT → USD → SWIFT por Tower Bank. Todo el sistema se recalcula desde aquí. Los cambios se guardan en este
            navegador.
          </p>
        </div>
        <Button onClick={() => actions.reset('params')} title="Volver a las tarifas originales">
          Restablecer tarifas
        </Button>
      </div>

      <div className="grid-2">
        <Card title="Tower Bank" subtitle="Comisiones del giro SWIFT" tone="editable">
          <div className="grid-2">{TOWER.map(field)}</div>
          <Callout kind="info">
            Con estos valores el TRE llega a su tope de {fmtMoney(p.treCap, 'USD')} en un giro de ≈ {fmtMoney(treCapGiro(p))} USD,
            y el corresponsal sube de {fmtMoney(p.corrLow, 'USD')} a {fmtMoney(p.corrHigh, 'USD')} al pasar{' '}
            {fmtMoney(p.threshold, 'USD')}.
          </Callout>
        </Card>
        <div className="stack">
          <Card title="Plataforma crypto" subtitle="Compra P2P y venta de USDT" tone="editable">
            {PLATFORM.map(field)}
          </Card>
          <Card title="Datos guardados">
            <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
              Tipos de cambio, montos, fondeo, escalas y parámetros se guardan automáticamente en este navegador. Puedes volver a los
              valores de ejemplo del libro original en cualquier momento.
            </p>
            <div>
              <Button onClick={() => actions.reset('all')}>Restablecer todo</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
