import { useEffect, useState } from 'react'
import './App.css'
import { Shell, type ViewKey } from './components/Shell'
import { CalculadoraView } from './features/calculadora/CalculadoraView'
import { EscalasView } from './features/escalas/EscalasView'
import { FondeoView } from './features/fondeo/FondeoView'
import { ParametrosView } from './features/parametros/ParametrosView'
import { ResumenView } from './features/resumen/ResumenView'
import { useAppStore } from './state/store'

const VIEWS: ViewKey[] = ['calculadora', 'resumen', 'fondeo', 'escalas', 'parametros']

function readHash(): ViewKey {
  const h = location.hash.replace('#', '') as ViewKey
  return VIEWS.includes(h) ? h : 'calculadora'
}

export function App() {
  const store = useAppStore()
  const [view, setView] = useState<ViewKey>(readHash)

  useEffect(() => {
    const onHash = () => setView(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (v: ViewKey) => {
    location.hash = v
    setView(v)
  }

  return (
    <Shell view={view} onNavigate={navigate} store={store}>
      {view === 'calculadora' && <CalculadoraView store={store} />}
      {view === 'resumen' && <ResumenView store={store} />}
      {view === 'fondeo' && <FondeoView store={store} />}
      {view === 'escalas' && <EscalasView store={store} />}
      {view === 'parametros' && <ParametrosView store={store} />}
    </Shell>
  )
}
