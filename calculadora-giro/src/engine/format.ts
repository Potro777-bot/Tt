const LOCALE = 'es-BO'

const num = (min: number, max = min) =>
  new Intl.NumberFormat(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max })

const f2 = num(2)
const f4 = num(4)
const f0 = num(0)

export function fmtMoney(x: number, currency?: 'USD' | 'BOB' | 'USDT'): string {
  const base = f2.format(Math.abs(x) < 5e-7 ? 0 : x)
  if (!currency) return base
  if (currency === 'BOB') return `Bs ${base}`
  return `${base} ${currency}`
}

export function fmtNumber(x: number, decimals = 2): string {
  if (decimals === 0) return f0.format(x)
  if (decimals === 4) return f4.format(x)
  return f2.format(x)
}

export function fmtRate(x: number): string {
  return f4.format(x)
}

export function fmtPct(x: number, decimals = 2, signed = false): string {
  const v = x * 100
  const s = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(Math.abs(v) < 5e-9 ? 0 : v)
  return `${s} %`
}

/** Compacta cifras grandes para ejes y tiles: 1.284 · 12,9 K · 4,2 M */
export function fmtCompact(x: number): string {
  const abs = Math.abs(x)
  if (abs >= 1e6) return `${num(1).format(x / 1e6)} M`
  if (abs >= 1e4) return `${num(1).format(x / 1e3)} K`
  return f0.format(x)
}

/** Parsea entradas del usuario aceptando "1.234,56", "1234.56" o "1,234.56". */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '')
  if (s === '') return null
  let normalized = s
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    // El separador decimal es el que aparece más a la derecha.
    normalized = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma > -1) {
    const parts = s.split(',')
    // Una sola coma con 1-2 decimales → decimal; si no, miles.
    normalized = parts.length === 2 && parts[1].length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '')
  } else if (lastDot > -1) {
    const parts = s.split('.')
    normalized = parts.length > 2 ? s.replace(/\./g, '') : s
  }
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}
