import type {
  CalculatorInputs,
  EscalaRow,
  FondeoInputs,
  FondeoResult,
  GiroResult,
  Rates,
  RouteParams,
  TowerFees,
} from './types'
import { SENSITIVITY_DELTAS } from './defaults'

const round4 = (x: number) => Math.round(x * 1e4) / 1e4
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0)

/** Comisiones de Tower Bank para un giro (SWIFT + TRE con tope + corresponsal, más ITBMS). */
export function towerFees(giro: number, p: RouteParams): TowerFees {
  const swift = p.swiftFee
  const tre = Math.min(p.trePct * giro, p.treCap)
  const correspondent = giro > p.threshold ? p.corrHigh : p.corrLow
  const subtotal = swift + tre + correspondent
  const itbms = subtotal * p.itbmsPct
  return {
    swift,
    tre,
    correspondent,
    subtotal,
    itbms,
    total: subtotal + itbms,
    nearThresholdAlert: giro > p.threshold && giro <= p.threshold * 1.03,
  }
}

interface Core {
  bobInvested: number
  usdt: number
  sellFee: number
  usdToTower: number
  usdForGiro: number
  giro: number
  fees: TowerFees
  leftover: number
  candidates?: GiroResult['candidates']
}

/** Bloque "Resultado" + "¿Estamos ganando o perdiendo?" común a ambos modos. */
function finish(
  mode: 'A' | 'B',
  core: Core,
  r: Rates,
  p: RouteParams,
  chargedBobInput: number | null,
): GiroResult {
  const { giro, usdt, bobInvested, fees } = core
  const soldUsd = usdt * r.sellPrice
  const costUsd = soldUsd - giro
  const myFee = r.myFeePct * giro
  const clientUsd = soldUsd + myFee
  const clientBob = clientUsd * r.buyRate
  const usdtGain = usdt * (r.sellPrice - 1)
  const pctOverGiro = safeDiv(clientUsd - giro, giro)
  const usdtGainPct = safeDiv(usdtGain, giro)
  const chargedBob = chargedBobInput ?? clientBob
  const profitBob = chargedBob - bobInvested

  return {
    mode,
    bobInvested,
    usdt,
    sellFee: core.sellFee,
    networkFee: p.networkFee,
    usdToTower: core.usdToTower,
    cushion: p.cushion,
    usdForGiro: core.usdForGiro,
    giro,
    fees,
    leftover: core.leftover,
    costUsd,
    costPct: safeDiv(costUsd, giro),
    bobPerUsd: safeDiv(bobInvested, giro),
    myFee,
    totalFees: fees.total + myFee,
    clientUsd,
    clientBob,
    myFeeBob: myFee * r.buyRate * (1 + p.p2pFeePct),
    pctOverGiro,
    usdtGain,
    usdtGainPct,
    totalPlusGainPct: pctOverGiro + usdtGainPct,
    chargedBob,
    spentBob: bobInvested,
    profitBob,
    profitPctSpent: safeDiv(profitBob, bobInvested),
    profitPctGiro: giro > 0 ? profitBob / r.buyRate / giro : 0,
    winning: profitBob >= 0,
    candidates: core.candidates,
  }
}

/** Modo A: "quiero entregar X" (hacia atrás). */
export function calcModeA(
  targetGiro: number,
  r: Rates,
  p: RouteParams,
  chargedBob: number | null = null,
): GiroResult {
  const giro = Math.max(0, targetGiro)
  const fees = towerFees(giro, p)
  const usdForGiro = giro + fees.total
  const usdToTower = usdForGiro + p.cushion
  const usdt = (usdToTower + p.networkFee) / (r.sellPrice * (1 - p.sellFeePct))
  const sellFee = usdt * r.sellPrice * p.sellFeePct
  const bobInvested = usdt * r.buyRate * (1 + p.p2pFeePct)
  const leftover = round4(usdToTower - p.cushion - giro - fees.total)
  return finish('A', { bobInvested, usdt, sellFee, usdToTower, usdForGiro, giro, fees, leftover }, r, p, chargedBob)
}

/** Modo B: "tengo X Bs" (hacia adelante). Resuelve el giro máximo que alcanza. */
export function calcModeB(
  bobAvailable: number,
  r: Rates,
  p: RouteParams,
  chargedBob: number | null = null,
): GiroResult {
  const bobInvested = Math.max(0, bobAvailable)
  const usdt = bobInvested / (r.buyRate * (1 + p.p2pFeePct))
  const sellFee = usdt * r.sellPrice * p.sellFeePct
  const usdToTower = usdt * r.sellPrice - sellFee - p.networkFee
  const usdForGiro = usdToTower - p.cushion

  // Candidatos: la misma lógica auxiliar del libro (filas 54-56).
  const k = 1 + p.itbmsPct
  const c1 = (usdForGiro - k * (p.swiftFee + p.corrLow)) / (1 + k * p.trePct)
  const c2 = (usdForGiro - k * (p.swiftFee + p.corrHigh)) / (1 + k * p.trePct)
  const c3 = usdForGiro - k * (p.swiftFee + p.treCap + p.corrHigh)
  const treCapGiro = p.trePct > 0 ? p.treCap / p.trePct : Infinity

  let giro: number
  if (c1 <= p.threshold) giro = c1
  else if (c2 <= p.threshold) giro = p.threshold
  else if (c2 <= treCapGiro) giro = c2
  else giro = c3
  giro = Math.max(0, giro)

  const fees = towerFees(giro, p)
  const leftover = round4(usdForGiro - giro - fees.total)
  return finish(
    'B',
    { bobInvested, usdt, sellFee, usdToTower, usdForGiro, giro, fees, leftover, candidates: { c1, c2, c3 } },
    r,
    p,
    chargedBob,
  )
}

export function calcBoth(inputs: CalculatorInputs, r: Rates, p: RouteParams) {
  return {
    A: calcModeA(inputs.targetGiro, r, p, inputs.chargedBobA),
    B: calcModeB(inputs.bobAvailable, r, p, inputs.chargedBobB),
  }
}

/** Hoja "Fondeo": ¿me alcanzan los USD para girar? Parte del plan en modo A. */
export function calcFondeo(plan: GiroResult, f: FondeoInputs, r: Rates, p: RouteParams): FondeoResult {
  const usdNeeded = plan.usdToTower
  const usdtPlan = plan.usdt
  const usdtWithMargin = usdtPlan * (1 + f.marginPct)
  const extraBob = (usdtWithMargin - usdtPlan) * r.buyRate * (1 + p.p2pFeePct)
  const usdReceived = f.usdtBought * f.realPrice - f.realFee
  const diff = usdReceived - usdNeeded
  const sensitivity = SENSITIVITY_DELTAS.map((delta) => {
    const price = r.sellPrice * (1 + delta)
    const usdPlan = usdtPlan * price - f.realFee
    const usdMargin = usdtWithMargin * price - f.realFee
    return { delta, price, usdPlan, diffPlan: usdPlan - usdNeeded, usdMargin, diffMargin: usdMargin - usdNeeded }
  })
  return {
    usdNeeded,
    usdtPlan,
    planPrice: r.sellPrice,
    marginPct: f.marginPct,
    usdtWithMargin,
    extraBob,
    usdReceived,
    diff,
    ok: diff >= 0,
    usdtMissing: diff < 0 && f.realPrice > 0 ? -diff / f.realPrice : 0,
    sensitivity,
  }
}

/** Hoja "Escalas": costo de cada tamaño de giro (hacia atrás). */
export function calcEscalas(giros: number[], r: Rates, p: RouteParams): EscalaRow[] {
  return giros.map((giro) => {
    const a = calcModeA(giro, r, p)
    return {
      giro,
      fees: a.fees.total,
      usdRequired: a.usdToTower,
      usdt: a.usdt,
      costUsd: a.costUsd,
      bob: a.bobInvested,
      effectiveRate: safeDiv(a.bobInvested, giro),
      costPct: safeDiv(a.costUsd, giro),
      myFee: a.myFee,
      clientUsd: a.clientUsd,
      clientBob: a.clientBob,
      gainPct: safeDiv(a.clientBob - a.bobInvested, a.bobInvested),
      nearThreshold: Math.abs(giro - p.threshold) <= p.threshold * 0.001 || a.fees.nearThresholdAlert,
    }
  })
}

/** Giro en el que el TRE llega a su tope (≈ USD 40,000 con los valores por defecto). */
export function treCapGiro(p: RouteParams): number {
  return p.trePct > 0 ? p.treCap / p.trePct : Infinity
}
