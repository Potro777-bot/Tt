import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { calcBoth, calcEscalas, calcFondeo } from '../engine/calc'
import {
  DEFAULT_ESCALAS,
  DEFAULT_FONDEO,
  DEFAULT_INPUTS,
  DEFAULT_PARAMS,
  DEFAULT_RATES,
} from '../engine/defaults'
import type { CalculatorInputs, FondeoInputs, Mode, Rates, RouteParams } from '../engine/types'

export interface AppState {
  rates: Rates
  params: RouteParams
  inputs: CalculatorInputs
  fondeo: FondeoInputs
  escalas: number[]
  mode: Mode
}

const STORAGE_KEY = 'giro:state:v1'

export const INITIAL_STATE: AppState = {
  rates: DEFAULT_RATES,
  params: DEFAULT_PARAMS,
  inputs: DEFAULT_INPUTS,
  fondeo: DEFAULT_FONDEO,
  escalas: DEFAULT_ESCALAS,
  mode: 'A',
}

type Action =
  | { type: 'rates'; patch: Partial<Rates> }
  | { type: 'params'; patch: Partial<RouteParams> }
  | { type: 'inputs'; patch: Partial<CalculatorInputs> }
  | { type: 'fondeo'; patch: Partial<FondeoInputs> }
  | { type: 'escalas'; value: number[] }
  | { type: 'mode'; value: Mode }
  | { type: 'reset'; section?: 'params' | 'rates' | 'all' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'rates':
      return { ...state, rates: { ...state.rates, ...action.patch } }
    case 'params':
      return { ...state, params: { ...state.params, ...action.patch } }
    case 'inputs':
      return { ...state, inputs: { ...state.inputs, ...action.patch } }
    case 'fondeo':
      return { ...state, fondeo: { ...state.fondeo, ...action.patch } }
    case 'escalas':
      return { ...state, escalas: action.value }
    case 'mode':
      return { ...state, mode: action.value }
    case 'reset':
      if (action.section === 'params') return { ...state, params: DEFAULT_PARAMS }
      if (action.section === 'rates') return { ...state, rates: DEFAULT_RATES }
      return { ...INITIAL_STATE, mode: state.mode }
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_STATE
    const saved = JSON.parse(raw) as Partial<AppState>
    return {
      rates: { ...DEFAULT_RATES, ...saved.rates },
      params: { ...DEFAULT_PARAMS, ...saved.params },
      inputs: { ...DEFAULT_INPUTS, ...saved.inputs },
      fondeo: { ...DEFAULT_FONDEO, ...saved.fondeo },
      escalas: Array.isArray(saved.escalas) && saved.escalas.length ? saved.escalas : DEFAULT_ESCALAS,
      mode: saved.mode === 'B' ? 'B' : 'A',
    }
  } catch {
    return INITIAL_STATE
  }
}

export function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* almacenamiento no disponible: la app sigue funcionando en memoria */
    }
  }, [state])

  const results = useMemo(() => {
    const both = calcBoth(state.inputs, state.rates, state.params)
    return {
      ...both,
      current: state.mode === 'A' ? both.A : both.B,
      fondeo: calcFondeo(both.A, state.fondeo, state.rates, state.params),
      escalas: calcEscalas(state.escalas, state.rates, state.params),
    }
  }, [state])

  const actions = useMemo(
    () => ({
      setRates: (patch: Partial<Rates>) => dispatch({ type: 'rates', patch }),
      setParams: (patch: Partial<RouteParams>) => dispatch({ type: 'params', patch }),
      setInputs: (patch: Partial<CalculatorInputs>) => dispatch({ type: 'inputs', patch }),
      setFondeo: (patch: Partial<FondeoInputs>) => dispatch({ type: 'fondeo', patch }),
      setEscalas: (value: number[]) => dispatch({ type: 'escalas', value }),
      setMode: (value: Mode) => dispatch({ type: 'mode', value }),
      reset: (section?: 'params' | 'rates' | 'all') => dispatch({ type: 'reset', section }),
    }),
    [],
  )

  return { state, results, actions }
}

export type AppStore = ReturnType<typeof useAppStore>

/** Tema claro/oscuro con persistencia; respeta el sistema cuando no hay preferencia guardada. */
export function useTheme() {
  const read = () => {
    const t = document.documentElement.dataset.theme
    if (t === 'light' || t === 'dark') return t
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  const [theme, bump] = useReducer(() => read(), undefined, read)

  const toggle = useCallback(() => {
    const next = read() === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('giro:theme', next)
    } catch {
      /* ignore */
    }
    bump()
  }, [])

  return { theme, toggle }
}
