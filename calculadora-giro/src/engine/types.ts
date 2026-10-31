/** Parámetros de la ruta (hoja "Parámetros" del libro original). */
export interface RouteParams {
  /** Comisión por vender la crypto a USD (fracción, 0.01 = 1 %). */
  sellFeePct: number
  /** Fee de red / retiro (USD). */
  networkFee: number
  /** Comisión Binance P2P al comprar USDT (fracción). */
  p2pFeePct: number
  /** Tower Bank: fee SWIFT fijo (USD). */
  swiftFee: number
  /** Tower Bank: TRE (fracción del giro). */
  trePct: number
  /** Tower Bank: tope del TRE (USD). */
  treCap: number
  /** Corresponsal cuando el giro ≤ umbral (USD). */
  corrLow: number
  /** Corresponsal cuando el giro > umbral (USD). */
  corrHigh: number
  /** Umbral de giro para el corresponsal (USD). */
  threshold: number
  /** ITBMS sobre comisiones (fracción). */
  itbmsPct: number
  /** Colchón retenido por Tower en cada giro (USD). */
  cushion: number
}

/** Tipos de cambio del día y comisión propia (cabecera de la hoja "Calculadora"). */
export interface Rates {
  /** Paso 1: Bs que pagas por 1 USDT. */
  buyRate: number
  /** Paso 2: USD que te pagan por 1 USDT. */
  sellPrice: number
  /** Tu comisión, como fracción del giro. */
  myFeePct: number
}

export interface CalculatorInputs {
  /** Modo A: neto que debe recibir el beneficiario (USD). */
  targetGiro: number
  /** Modo B: bolivianos disponibles. */
  bobAvailable: number
  /** Opcional: lo que realmente cobras al cliente en Bs (modo A). null = usa lo recomendado. */
  chargedBobA: number | null
  /** Opcional: lo que realmente cobras al cliente en Bs (modo B). null = usa lo recomendado. */
  chargedBobB: number | null
}

export interface FondeoInputs {
  /** Margen de seguridad sobre los USDT a comprar (fracción). */
  marginPct: number
  /** USDT que compraste realmente. */
  usdtBought: number
  /** Precio real de venta (USD por USDT). */
  realPrice: number
  /** Comisión / fee real de la plataforma (USD). */
  realFee: number
}

export type Mode = 'A' | 'B'

/** Desglose de comisiones de Tower Bank para un giro dado. */
export interface TowerFees {
  swift: number
  tre: number
  correspondent: number
  subtotal: number
  itbms: number
  total: number
  /** true si el giro quedó justo por encima del umbral (zona muerta). */
  nearThresholdAlert: boolean
}

/** Resultado completo de una corrida (sirve para modo A y modo B). */
export interface GiroResult {
  mode: Mode
  // Paso 1
  bobInvested: number
  usdt: number
  // Paso 2
  sellFee: number
  networkFee: number
  usdToTower: number
  // Paso 3
  cushion: number
  usdForGiro: number
  giro: number
  fees: TowerFees
  leftover: number
  // Resultado
  costUsd: number
  costPct: number
  bobPerUsd: number
  myFee: number
  totalFees: number
  clientUsd: number
  clientBob: number
  myFeeBob: number
  pctOverGiro: number
  usdtGain: number
  usdtGainPct: number
  totalPlusGainPct: number
  // ¿Ganamos o perdemos?
  chargedBob: number
  spentBob: number
  profitBob: number
  profitPctSpent: number
  profitPctGiro: number
  winning: boolean
  /** Solo modo B: candidatos de giro máximo. */
  candidates?: { c1: number; c2: number; c3: number }
}

export interface SensitivityRow {
  delta: number
  price: number
  usdPlan: number
  diffPlan: number
  usdMargin: number
  diffMargin: number
}

export interface FondeoResult {
  usdNeeded: number
  usdtPlan: number
  planPrice: number
  marginPct: number
  usdtWithMargin: number
  extraBob: number
  usdReceived: number
  diff: number
  ok: boolean
  usdtMissing: number
  sensitivity: SensitivityRow[]
}

export interface EscalaRow {
  giro: number
  fees: number
  usdRequired: number
  usdt: number
  costUsd: number
  bob: number
  effectiveRate: number
  costPct: number
  myFee: number
  clientUsd: number
  clientBob: number
  gainPct: number
  nearThreshold: boolean
}
