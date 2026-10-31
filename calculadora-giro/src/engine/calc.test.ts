import { describe, expect, it } from 'vitest'
import { calcEscalas, calcFondeo, calcModeA, calcModeB, towerFees } from './calc'
import { DEFAULT_ESCALAS, DEFAULT_FONDEO, DEFAULT_PARAMS, DEFAULT_RATES } from './defaults'
import { parseNumber } from './format'

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps)

// Valores de referencia tomados del libro calculadora_giro_crypto.xlsx (hoja Calculadora).
describe('Modo A (quiero entregar X)', () => {
  const a = calcModeA(5000, DEFAULT_RATES, DEFAULT_PARAMS)
  it('replica la columna C del Excel', () => {
    close(a.bobInvested, 57986.3072519084)
    close(a.usdt, 4832.19227099237)
    close(a.usdToTower, 5064.1375)
    close(a.usdForGiro, 5044.1375)
    close(a.fees.tre, 6.25)
    close(a.fees.correspondent, 15)
    close(a.fees.subtotal, 41.25)
    close(a.fees.itbms, 2.8875)
    close(a.fees.total, 44.1375)
    close(a.leftover, 0)
    close(a.costUsd, 64.1375)
    close(a.costPct, 0.0128275)
    close(a.bobPerUsd, 11.5972614503817)
    close(a.bobPerUsdt, 12)
    close(a.effectiveBobPerUsdt, 57986.3072519084 / (5000 / 1.048))
    close(a.clientBobPerUsdt, 61369.65 / 4832.19227099237)
    close(a.clientBobPerUsd, 61369.65 / 5000)
    close(a.myFee, 50)
    close(a.totalFees, 94.1375)
    close(a.clientUsd, 5114.1375)
    close(a.clientBob, 61369.65)
    close(a.myFeeBob, 600)
    close(a.pctOverGiro, 0.0228275)
    close(a.usdtGain, 231.945229007634)
    close(a.usdtGainPct, 0.0463890458015268)
    close(a.totalPlusGainPct, 0.0692165458015265)
    close(a.chargedBob, 61369.65)
    close(a.profitBob, 3383.3427480916)
    close(a.profitPctSpent, 0.058347270389084)
    close(a.profitPctGiro, 0.0563890458015267)
    expect(a.winning).toBe(true)
  })
  it('usa lo cobrado real si se indica', () => {
    const b = calcModeA(5000, DEFAULT_RATES, DEFAULT_PARAMS, 57000)
    close(b.chargedBob, 57000)
    expect(b.winning).toBe(false)
  })
})

describe('Modo B (tengo X Bs)', () => {
  const b = calcModeB(50000, DEFAULT_RATES, DEFAULT_PARAMS)
  it('replica la columna D del Excel', () => {
    close(b.usdt, 4166.66666666667)
    close(b.usdToTower, 4366.66666666667)
    close(b.usdForGiro, 4346.66666666667)
    close(b.giro, 4303.4607878629)
    close(b.fees.tre, 5.37932598482863)
    close(b.fees.total, 43.2058788037666)
    close(b.leftover, 0)
    close(b.costUsd, 63.2058788037666)
    close(b.bobPerUsd, 11.6185559633808)
    close(b.myFee, 43.034607878629)
    close(b.clientUsd, 4409.7012745453)
    close(b.clientBob, 52916.4152945436)
    close(b.usdtGain, 200)
    close(b.profitBob, 2916.41529454355)
    close(b.profitPctSpent, 0.058328305890871)
    close(b.candidates!.c1, 4303.4607878629)
    close(b.candidates!.c2, 4292.77507999717)
    close(b.candidates!.c3, 4245.01666666667)
  })
  it('se queda en el umbral cuando cae en la zona muerta', () => {
    // Con 115.400 Bs el giro libre pasaría de 10.000 pero con corresponsal alto no alcanza: se fija en el umbral.
    const z = calcModeB(115400, DEFAULT_RATES, DEFAULT_PARAMS)
    expect(z.giro).toBe(10000)
    expect(z.leftover).toBeGreaterThan(0)
  })
  it('aplica el tope del TRE en giros grandes', () => {
    const big = calcModeB(600000, DEFAULT_RATES, DEFAULT_PARAMS)
    close(big.fees.tre, 50)
    close(big.leftover, 0, 1e-3)
  })
})

describe('Comisiones Tower', () => {
  it('cambia el corresponsal al pasar el umbral y alerta en la zona cercana', () => {
    expect(towerFees(10000, DEFAULT_PARAMS).correspondent).toBe(15)
    expect(towerFees(10001, DEFAULT_PARAMS).correspondent).toBe(25)
    expect(towerFees(10001, DEFAULT_PARAMS).nearThresholdAlert).toBe(true)
    expect(towerFees(10400, DEFAULT_PARAMS).nearThresholdAlert).toBe(false)
  })
})

describe('Fondeo', () => {
  const plan = calcModeA(5000, DEFAULT_RATES, DEFAULT_PARAMS)
  const f = calcFondeo(plan, DEFAULT_FONDEO, DEFAULT_RATES, DEFAULT_PARAMS)
  it('replica la hoja Fondeo', () => {
    close(f.usdNeeded, 5064.1375)
    close(f.usdtWithMargin, 4846.68884780534)
    close(f.extraBob, 173.958921755722)
    close(f.usdReceived, 5063.936)
    close(f.diff, -0.2015)
    expect(f.ok).toBe(false)
    close(f.usdtMissing, 0.192270992365662)
    expect(f.sensitivity).toHaveLength(9)
    close(f.sensitivity[0].price, 1.03752)
    close(f.sensitivity[0].diffPlan, -50.641375)
    close(f.sensitivity[0].diffMargin, -35.600886625)
    close(f.sensitivity[8].diffMargin, 65.985711625)
  })
})

describe('Escalas', () => {
  const rows = calcEscalas(DEFAULT_ESCALAS, DEFAULT_RATES, DEFAULT_PARAMS)
  it('salta el costo entre 10.000 y 10.001', () => {
    const r10000 = rows.find((r) => r.giro === 10000)!
    const r10001 = rows.find((r) => r.giro === 10001)!
    close(r10000.fees, (20 + 12.5 + 15) * 1.07)
    close(r10001.fees, (20 + 12.50125 + 25) * 1.07)
    expect(r10001.fees - r10000.fees).toBeGreaterThan(10)
  })
  it('la fila de 5.000 coincide con el modo A', () => {
    const r = rows.find((r) => r.giro === 5000)!
    close(r.bob, 57986.3072519084)
    close(r.clientBob, 61369.65)
    close(r.gainPct, 0.058347270389084)
  })
})

describe('parseNumber', () => {
  it('acepta formatos latino e inglés', () => {
    expect(parseNumber('1.234,56')).toBe(1234.56)
    expect(parseNumber('1,234.56')).toBe(1234.56)
    expect(parseNumber('1234.56')).toBe(1234.56)
    expect(parseNumber('12,5')).toBe(12.5)
    expect(parseNumber('1.048')).toBe(1.048)
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
  })
})
