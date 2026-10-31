import type { CalculatorInputs, FondeoInputs, Rates, RouteParams } from './types'

export const DEFAULT_PARAMS: RouteParams = {
  sellFeePct: 0,
  networkFee: 0,
  p2pFeePct: 0,
  swiftFee: 20,
  trePct: 0.00125,
  treCap: 50,
  corrLow: 15,
  corrHigh: 25,
  threshold: 10000,
  itbmsPct: 0.07,
  cushion: 20,
}

export const DEFAULT_RATES: Rates = {
  buyRate: 12,
  sellPrice: 1.048,
  myFeePct: 0.01,
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  targetGiro: 5000,
  bobAvailable: 50000,
  chargedBobA: null,
  chargedBobB: null,
}

export const DEFAULT_FONDEO: FondeoInputs = {
  marginPct: 0.003,
  usdtBought: 4832,
  realPrice: 1.048,
  realFee: 0,
}

export const DEFAULT_ESCALAS: number[] = [
  500, 1000, 2000, 5000, 9000, 9990, 10000, 10001, 15000, 25000, 40000, 50000, 100000,
]

export const SENSITIVITY_DELTAS: number[] = [
  -0.01, -0.0075, -0.005, -0.0025, 0, 0.0025, 0.005, 0.0075, 0.01,
]
