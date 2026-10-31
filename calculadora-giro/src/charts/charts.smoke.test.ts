import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { calcEscalas, calcFondeo, calcModeA, treCapGiro } from '../engine/calc'
import { DEFAULT_ESCALAS, DEFAULT_FONDEO, DEFAULT_PARAMS, DEFAULT_RATES } from '../engine/defaults'
import { EscalasChart } from './EscalasChart'
import { SensitivityChart } from './SensitivityChart'
import { BreakdownBar } from './BreakdownBar'

describe('charts (render estático)', () => {
  it('EscalasChart dibuja un svg con columnas y referencias', () => {
    const rows = calcEscalas(DEFAULT_ESCALAS, DEFAULT_RATES, DEFAULT_PARAMS)
    const html = renderToStaticMarkup(
      createElement(EscalasChart, { rows, threshold: DEFAULT_PARAMS.threshold, treCapGiro: treCapGiro(DEFAULT_PARAMS) }),
    )
    expect(html).toContain('<svg')
    expect(html).toContain('role="img"')
    expect(html).toContain('Umbral USD 10.000')
    expect(html).toContain('Tope TRE')
    expect((html.match(/class="viz-bar/g) ?? []).length).toBe(rows.length)
  })

  it('SensitivityChart dibuja un svg con leyenda y dos series', () => {
    const plan = calcModeA(5000, DEFAULT_RATES, DEFAULT_PARAMS)
    const { sensitivity } = calcFondeo(plan, DEFAULT_FONDEO, DEFAULT_RATES, DEFAULT_PARAMS)
    const html = renderToStaticMarkup(createElement(SensitivityChart, { rows: sensitivity }))
    expect(html).toContain('<svg')
    expect(html).toContain('Plan')
    expect(html).toContain('Con margen')
    expect(html).toContain('var(--series-1)')
    expect(html).toContain('var(--series-2)')
    expect(html).toContain('+1,00')
  })

  it('BreakdownBar dibuja un svg, omite partes en cero y etiqueta solo donde cabe', () => {
    const a = calcModeA(5000, DEFAULT_RATES, DEFAULT_PARAMS)
    const parts = [
      { key: 'giro', label: 'Giro', value: a.giro, color: 'var(--series-1)' },
      { key: 'tower', label: 'Tower Bank', value: a.fees.total, color: 'var(--series-2)' },
      { key: 'cushion', label: 'Colchón', value: a.cushion, color: 'var(--series-3)' },
      { key: 'net', label: 'Red', value: a.networkFee, color: 'var(--series-4)' },
      { key: 'mine', label: 'Mi comisión', value: a.myFee, color: 'var(--series-7)' },
    ]
    const html = renderToStaticMarkup(
      createElement(BreakdownBar, { parts, total: a.clientUsd, totalLabel: 'Total que paga el cliente' }),
    )
    expect(html).toContain('<svg')
    expect(html).toContain('tabindex="0"')
    // La leyenda lista los nombres en orden de bloque.
    expect(html).toMatch(/Giro<[\s\S]*Tower Bank<[\s\S]*Colchón<[\s\S]*Mi comisión</)
    // La parte "Red" vale 0 → no se dibuja ni aparece en la leyenda.
    expect(html).not.toContain('Red<')
    // Las partes diminutas (0,4 %) siguen siendo visibles: ≥ 2 px de ancho.
    expect((html.match(/class="viz-seg__block" x="[\d.]+" y="0" width="([\d.]+)"/g) ?? []).length).toBe(4)
    // Solo el bloque del giro (~98 %) tiene sitio para su porcentaje.
    expect((html.match(/viz-seg__label /g) ?? []).length).toBe(1)
    expect(html).toContain('98 %')
  })
})
