import type { ReactNode } from 'react'
import type { AppStore } from '../state/store'
import { useTheme } from '../state/store'
import './Shell.css'

export type ViewKey = 'calculadora' | 'resumen' | 'fondeo' | 'escalas' | 'parametros'

const NAV: { key: ViewKey; label: string; hint: string }[] = [
  { key: 'calculadora', label: 'Calculadora', hint: 'Modo A y modo B, paso a paso' },
  { key: 'resumen', label: 'Resumen', hint: 'El giro en palabras simples' },
  { key: 'fondeo', label: 'Fondeo', hint: '¿Me alcanzan los USD para girar?' },
  { key: 'escalas', label: 'Escalas', hint: 'Costo por tamaño de giro' },
  { key: 'parametros', label: 'Parámetros', hint: 'Tarifas de la ruta' },
]

export function Shell({
  view,
  onNavigate,
  store,
  children,
}: {
  view: ViewKey
  onNavigate: (v: ViewKey) => void
  store: AppStore
  children: ReactNode
}) {
  const { theme, toggle } = useTheme()
  const { rates } = store.state

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              ⇄
            </span>
            <div>
              <h1 className="brand__title">Calculadora de giro</h1>
              <p className="brand__route" aria-label="Ruta de la operación">
                <span className="route-chip" style={{ ['--c' as string]: 'var(--step-bob)' }}>BOB</span>
                <span className="route-arrow">→</span>
                <span className="route-chip" style={{ ['--c' as string]: 'var(--step-usdt)' }}>USDT</span>
                <span className="route-arrow">→</span>
                <span className="route-chip" style={{ ['--c' as string]: 'var(--step-usd)' }}>USD</span>
                <span className="route-arrow">→</span>
                <span className="route-chip" style={{ ['--c' as string]: 'var(--step-swift)' }}>SWIFT</span>
              </p>
            </div>
          </div>
          <div className="topbar__right">
            <div className="rates-pill tabular" title="Tipos de cambio en uso (edítalos en Calculadora)">
              <span>
                <b>{rates.buyRate.toFixed(4)}</b> Bs/USDT
              </span>
              <span className="rates-pill__sep" />
              <span>
                <b>{rates.sellPrice.toFixed(4)}</b> USD/USDT
              </span>
              <span className="rates-pill__sep" />
              <span>
                <b>{(rates.myFeePct * 100).toFixed(2)} %</b> comisión
              </span>
            </div>
            <button
              className="theme-btn"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </div>
        <nav className="tabs" aria-label="Secciones">
          <div className="tabs__inner">
            {NAV.map((n) => (
              <button
                key={n.key}
                className={`tab ${view === n.key ? 'is-active' : ''}`}
                aria-current={view === n.key ? 'page' : undefined}
                onClick={() => onNavigate(n.key)}
                title={n.hint}
              >
                {n.label}
              </button>
            ))}
          </div>
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">
        Las comisiones son las trabajadas en esta operación. Si Tower Bank o la plataforma cambian tarifas,
        actualízalas en <a href="#parametros">Parámetros</a>. Los datos se guardan solo en este navegador.
      </footer>
    </div>
  )
}
