import { Button, Callout, Card, NumberField, Row, Segmented, StatTile, StatusBadge } from '../../components/ui'
import { fmtMoney, fmtPct, fmtRate } from '../../engine/format'
import type { GiroResult } from '../../engine/types'
import type { AppStore } from '../../state/store'
import './calculadora.css'

export function CalculadoraView({ store }: { store: AppStore }) {
  const { state, results, actions } = store
  const { rates, inputs, mode } = state
  const r: GiroResult = results.current
  const isA = mode === 'A'

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2 className="view-title">Calculadora de giro</h2>
          <p className="view-lead">
            Compras USDT con bolivianos, los vendes por USD y Tower Bank envía el SWIFT. Elige si partes del monto
            que debe llegar o de los bolivianos que tienes.
          </p>
        </div>
        <Segmented
          ariaLabel="Modo de cálculo"
          value={mode}
          onChange={actions.setMode}
          options={[
            { value: 'A', label: 'A · Quiero entregar X', description: 'Hacia atrás: defines el giro y calcula USDT y Bs' },
            { value: 'B', label: 'B · Tengo X Bs', description: 'Hacia adelante: defines los Bs y calcula el giro máximo' },
          ]}
        />
      </div>

      {/* Titulares: qué comprar y qué debe llegar */}
      <div className="grid-3 headline">
        <StatTile
          label="1) Compra en Binance"
          value={fmtMoney(r.usdt, 'USDT')}
          sub={`gastando ${fmtMoney(r.bobInvested, 'BOB')}`}
          accent="var(--step-usdt)"
        />
        <StatTile
          label="2) Vende: USD que te tienen que dar"
          value={fmtMoney(r.usdToTower, 'USD')}
          sub="giro + comisiones Tower + colchón"
          accent="var(--step-usd)"
        />
        <StatTile
          label={isA ? '3) Giro SWIFT (tu dato)' : '3) Giro SWIFT máximo que alcanza'}
          value={fmtMoney(r.giro, 'USD')}
          sub={`el cliente entrega ${fmtMoney(r.clientBob, 'BOB')}`}
          accent="var(--step-swift)"
        />
      </div>

      <div className="layout-main">
        {/* Columna izquierda: entradas */}
        <div className="stack">
          <Card
            title="Tipos de cambio del día"
            subtitle="En el orden de la operación. Amarillo = editable."
            tone="editable"
            actions={
              <Button variant="subtle" onClick={() => actions.reset('rates')} title="Volver a los valores de ejemplo">
                Restablecer
              </Button>
            }
          >
            <NumberField
              label="Paso 1 · Compra de USDT con bolivianos"
              value={rates.buyRate}
              decimals={4}
              unit="Bs por 1 USDT"
              min={0.0001}
              onChange={(v) => v !== null && actions.setRates({ buyRate: v })}
              hint="Lo que pagas en Bs por cada USDT. Usa tu tasa P2P real."
            />
            <NumberField
              label="Paso 2 · Venta de esos USDT por USD"
              value={rates.sellPrice}
              decimals={4}
              unit="USD por 1 USDT"
              min={0.0001}
              onChange={(v) => v !== null && actions.setRates({ sellPrice: v })}
              hint="Lo que te pagan en USD por cada USDT. 1,0000 = a la par; si vendes a menos, bájalo (ej. 0,9980)."
            />
            <NumberField
              label="Extra · Tu comisión (aparte de Tower Bank)"
              value={rates.myFeePct}
              percent
              unit="% del giro"
              min={0}
              onChange={(v) => v !== null && actions.setRates({ myFeePct: v })}
              hint="Se cobra al cliente encima del giro; no cambia los USDT que necesitas."
            />
          </Card>

          <Card
            title={isA ? 'A) Quiero entregar X' : 'B) Tengo X Bs'}
            subtitle={
              isA
                ? 'Defines cuánto debe llegar y calcula cuántos USDT y Bs necesitas.'
                : 'Defines cuántos Bs tienes, los pasa a USDT y calcula cuánto puede llegar.'
            }
            tone="editable"
          >
            {isA ? (
              <NumberField
                label="Neto que recibe el beneficiario"
                value={inputs.targetGiro}
                unit="USD"
                min={0}
                onChange={(v) => v !== null && actions.setInputs({ targetGiro: v })}
              />
            ) : (
              <NumberField
                label="Bolivianos disponibles"
                value={inputs.bobAvailable}
                unit="BOB"
                min={0}
                onChange={(v) => v !== null && actions.setInputs({ bobAvailable: v })}
              />
            )}
            <NumberField
              label="Lo que realmente cobras al cliente (opcional)"
              value={isA ? inputs.chargedBobA : inputs.chargedBobB}
              unit="BOB"
              min={0}
              allowEmpty
              placeholder={fmtMoney(r.clientBob)}
              onChange={(v) => actions.setInputs(isA ? { chargedBobA: v } : { chargedBobB: v })}
              hint="Si lo dejas vacío se usa lo recomendado (fila «El cliente debe entregar (BOB)»)."
            />
          </Card>

          <ProfitCard r={r} />
        </div>

        {/* Columna derecha: pasos */}
        <div className="stack">
          <Card
            step={{ n: 1, color: 'var(--step-bob)' }}
            title="Compra de USDT con bolivianos"
            subtitle={`Usa el TC del Paso 1: ${fmtRate(rates.buyRate)} Bs por USDT`}
          >
            <Row label="BOB invertidos" note="Lo que sale de tu bolsillo en bolivianos." value={fmtMoney(r.bobInvested, 'BOB')} emphasis={!isA} />
            <Row
              label="USDT comprados (los mismos que vendes)"
              note="BOB ÷ TC del Paso 1. Son los USDT que luego vendes por USD."
              value={fmtMoney(r.usdt, 'USDT')}
              emphasis={isA}
            />
          </Card>

          <Card
            step={{ n: 2, color: 'var(--step-usdt)' }}
            title="Venta de USDT por USD"
            subtitle={`Usa el precio del Paso 2: ${fmtRate(rates.sellPrice)} USD por USDT`}
          >
            <Row label="Comisión de venta" note="En 0 en esta ruta (se edita en Parámetros)." value={fmtMoney(r.sellFee, 'USD')} />
            <Row label="Fee de red / retiro" value={fmtMoney(r.networkFee, 'USD')} />
            <Row
              label="USD que llegan a Tower Bank"
              note="= giro + comisiones + colchón. Lo que te tiene que dar la venta de los USDT."
              value={fmtMoney(r.usdToTower, 'USD')}
              emphasis
            />
          </Card>

          <Card step={{ n: 3, color: 'var(--step-swift)' }} title="Giro SWIFT por Tower Bank" subtitle="Comisiones de Tower Bank y lo que recibe el beneficiario">
            <Row label="Colchón que retiene Tower Bank" note="Tower retiene este colchón en cada giro." value={fmtMoney(r.cushion, 'USD')} />
            <Row label="Dinero que queda para el giro + comisiones de Tower" value={fmtMoney(r.usdForGiro, 'USD')} />
            <Row
              label="Giro SWIFT = lo que recibe el beneficiario"
              note={isA ? 'Modo A: es tu dato.' : 'Modo B: es el giro máximo que alcanza.'}
              value={fmtMoney(r.giro, 'USD')}
              emphasis
            />
            <p className="section-label">Comisiones de Tower Bank</p>
            <Row label="Comisión SWIFT" value={fmtMoney(r.fees.swift, 'USD')} />
            <Row label="TRE" note={`${fmtPct(state.params.trePct, 3)} con tope en ${fmtMoney(state.params.treCap, 'USD')}.`} value={fmtMoney(r.fees.tre, 'USD')} />
            <Row
              label="Comisión corresponsal"
              note={`${fmtMoney(state.params.corrLow, 'USD')} hasta el umbral de ${fmtMoney(state.params.threshold, 'USD')}, ${fmtMoney(state.params.corrHigh, 'USD')} por encima.`}
              value={fmtMoney(r.fees.correspondent, 'USD')}
            />
            <Row label="Subtotal comisiones Tower" value={fmtMoney(r.fees.subtotal, 'USD')} />
            <Row label="ITBMS" note={`${fmtPct(state.params.itbmsPct)} sobre SWIFT + TRE + corresponsal.`} value={fmtMoney(r.fees.itbms, 'USD')} />
            <Row label="Total comisiones Tower" value={fmtMoney(r.fees.total, 'USD')} emphasis />
            {r.fees.nearThresholdAlert && (
              <Callout kind="warn">
                <b>Alerta:</b> pasaste el umbral de {fmtMoney(state.params.threshold, 'USD')} y el corresponsal sube a{' '}
                {fmtMoney(state.params.corrHigh, 'USD')}. Un giro apenas por debajo del umbral cuesta menos.
              </Callout>
            )}
            {r.leftover > 0.005 && (
              <Callout kind="info">
                <b>Sobrante que no se puede usar:</b> {fmtMoney(r.leftover, 'USD')}. Caíste justo en la zona muerta del
                umbral: con corresponsal bajo el giro pasaría de {fmtMoney(state.params.threshold, 'USD')}, pero con el alto no
                alcanza, así que el giro se fija en el umbral.
              </Callout>
            )}
          </Card>

          <Card title="Resultado" subtitle="Lo que cuesta, lo que cobras y lo que ganas">
            <Row
              label="Costo total para ti"
              note="USDT × precio del Paso 2 − giro: comisiones Tower + colchón (+ comisión de venta y fee de red si los hubiera)."
              value={fmtMoney(r.costUsd, 'USD')}
            />
            <Row label="Costo para ti como % del giro (sin tu comisión)" value={fmtPct(r.costPct)} />
            <Row label="Bs que te cuesta cada USD que recibe el beneficiario" note="Siempre mayor que el TC de compra." value={`${fmtRate(r.bobPerUsd)} Bs`} />
            <Row label="Comisión extra propia = tu ganancia" note="Giro × tu comisión %." value={fmtMoney(r.myFee, 'USD')} />
            <Row label="Total comisiones: Tower + extra" value={fmtMoney(r.totalFees, 'USD')} />
            <Row
              label="El cliente debe entregar"
              note="Giro + comisiones Tower + colchón + tu comisión. No depende del precio de venta de los USDT."
              value={fmtMoney(r.clientUsd, 'USD')}
              emphasis
            />
            <Row label="El cliente debe entregar en bolivianos" note="USD que entrega × TC del Paso 1." value={fmtMoney(r.clientBob, 'BOB')} emphasis />
            <Row label="Tu comisión extra en Bs" value={fmtMoney(r.myFeeBob, 'BOB')} />
            <Row label="% TOTAL que se cobra encima del giro" note="Tower + colchón + tu comisión." value={fmtPct(r.pctOverGiro)} />
            <Row
              label="+ Ganancia (o pérdida) por vender los USDT a USD"
              note="USDT × (precio de venta − 1). Va aparte de lo que cobras al cliente."
              value={fmtMoney(r.usdtGain, 'USD')}
              tone={r.usdtGain >= 0 ? 'good' : 'bad'}
            />
            <Row label="+ Ganancia por vender los USDT (% del giro)" value={fmtPct(r.usdtGainPct)} />
            <Row label="TOTAL + ganancia USDT → USD (% del giro)" value={fmtPct(r.totalPlusGainPct)} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function ProfitCard({ r }: { r: GiroResult }) {
  const tone = r.winning ? 'good' : 'bad'
  return (
    <Card title="¿Estamos ganando o perdiendo?" subtitle="Lo que cobras en Bs menos lo que gastaste comprando USDT">
      <div className="profit">
        <StatusBadge kind={tone} large>
          {r.winning ? 'GANANDO' : 'PERDIENDO'} {fmtPct(Math.abs(r.profitPctSpent))}
        </StatusBadge>
        <span className={`profit__value tabular tone-${tone}`}>{fmtMoney(r.profitBob, 'BOB')}</span>
      </div>
      <Row label="Lo que cobras al cliente" value={fmtMoney(r.chargedBob, 'BOB')} />
      <Row label="Lo que gastaste comprando USDT" value={fmtMoney(r.spentBob, 'BOB')} />
      <Row label="% sobre lo que gastaste" value={fmtPct(r.profitPctSpent, 2, true)} tone={tone} />
      <Row label="% sobre el giro" note="En USD al TC del Paso 1." value={fmtPct(r.profitPctGiro, 2, true)} tone={tone} />
      {!r.winning && (
        <Callout kind="bad">
          Para no perder tienes que cobrar al menos <b>{fmtMoney(r.spentBob, 'BOB')}</b>, lo que gastaste en comprar los USDT.
        </Callout>
      )}
    </Card>
  )
}
