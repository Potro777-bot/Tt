import type { ReactNode } from 'react'
import { useEffect, useId, useState } from 'react'
import { fmtNumber, parseNumber } from '../engine/format'
import './ui.css'

/* ── Card ─────────────────────────────────────────────── */
export function Card({
  title,
  subtitle,
  step,
  tone,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  step?: { n: string | number; color: string }
  tone?: 'default' | 'editable'
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`card ${tone === 'editable' ? 'card--editable' : ''} ${className}`}>
      {(title || actions) && (
        <header className="card__head">
          <div className="card__titles">
            {step && (
              <span className="step-dot" style={{ background: step.color }} aria-hidden="true">
                {step.n}
              </span>
            )}
            <div>
              {title && <h2 className="card__title">{title}</h2>}
              {subtitle && <p className="card__subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  )
}

/* ── Número editable ───────────────────────────────────── */
type NumberFieldProps = {
  label: ReactNode
  value: number | null
  onChange: (v: number | null) => void
  /** Unidad mostrada a la derecha (Bs, USD, %, USDT). */
  unit?: string
  hint?: ReactNode
  /** Si es true, el valor se muestra ×100 y se guarda /100. */
  percent?: boolean
  decimals?: number
  min?: number
  placeholder?: string
  allowEmpty?: boolean
  highlight?: boolean
  compact?: boolean
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  percent = false,
  decimals = 2,
  min,
  placeholder,
  allowEmpty = false,
  highlight = true,
  compact = false,
}: NumberFieldProps) {
  const id = useId()
  const toText = (v: number | null) => (v === null ? '' : fmtNumber(percent ? v * 100 : v, decimals))
  const [text, setText] = useState(() => toText(value))
  const [focused, setFocused] = useState(false)
  const [invalid, setInvalid] = useState(false)

  // Sincroniza cuando el valor cambia desde fuera (reset, otro modo) y no estamos escribiendo.
  useEffect(() => {
    if (!focused) setText(toText(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused, percent, decimals])

  const commit = (raw: string) => {
    const parsed = parseNumber(raw)
    if (parsed === null) {
      if (allowEmpty || raw.trim() === '') {
        setInvalid(false)
        onChange(null)
        return
      }
      setInvalid(true)
      return
    }
    let v = percent ? parsed / 100 : parsed
    if (min !== undefined && v < min) v = min
    setInvalid(false)
    onChange(v)
  }

  return (
    <div className={`field ${compact ? 'field--compact' : ''} ${invalid ? 'field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className={`field__control ${highlight ? 'field__control--editable' : ''}`}>
        <input
          id={id}
          className="field__input tabular"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            setText(e.target.value)
            commit(e.target.value)
          }}
          onBlur={() => {
            setFocused(false)
            if (!invalid) setText(toText(value))
          }}
        />
        {unit && <span className="field__unit">{unit}</span>}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}

/* ── Fila de resultado (etiqueta · valor · nota) ───────── */
export function Row({
  label,
  value,
  note,
  emphasis,
  tone,
}: {
  label: ReactNode
  value: ReactNode
  note?: ReactNode
  emphasis?: boolean
  tone?: 'good' | 'bad' | 'warn'
}) {
  return (
    <div className={`row ${emphasis ? 'row--emphasis' : ''}`}>
      <div className="row__label">
        <span>{label}</span>
        {note && <span className="row__note">{note}</span>}
      </div>
      <span className={`row__value tabular ${tone ? `tone-${tone}` : ''}`}>{value}</span>
    </div>
  )
}

/* ── Stat tile ─────────────────────────────────────────── */
export function StatTile({
  label,
  value,
  sub,
  accent,
  hero,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  accent?: string
  hero?: boolean
}) {
  return (
    <div className={`tile ${hero ? 'tile--hero' : ''}`} style={accent ? { ['--tile-accent' as string]: accent } : undefined}>
      <span className="tile__label">{label}</span>
      <span className="tile__value">{value}</span>
      {sub && <span className="tile__sub">{sub}</span>}
    </div>
  )
}

/* ── Badge de estado (siempre icono + texto) ───────────── */
export function StatusBadge({
  kind,
  children,
  large,
}: {
  kind: 'good' | 'warn' | 'bad' | 'info'
  children: ReactNode
  large?: boolean
}) {
  const icon = kind === 'good' ? '✓' : kind === 'bad' ? '✕' : kind === 'warn' ? '!' : 'i'
  return (
    <span className={`badge badge--${kind} ${large ? 'badge--large' : ''}`} role="status">
      <span className="badge__icon" aria-hidden="true">
        {icon}
      </span>
      {children}
    </span>
  )
}

/* ── Segmented control ─────────────────────────────────── */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; description?: string }[]
  ariaLabel: string
}) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={`segmented__btn ${o.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
          title={o.description}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Callout ───────────────────────────────────────────── */
export function Callout({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'bad' | 'good'; children: ReactNode }) {
  return <div className={`callout callout--${kind}`}>{children}</div>
}

/* ── Botón ─────────────────────────────────────────────── */
export function Button({
  children,
  onClick,
  variant = 'ghost',
  ariaLabel,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'ghost' | 'primary' | 'subtle'
  ariaLabel?: string
  title?: string
}) {
  return (
    <button className={`btn btn--${variant}`} onClick={onClick} aria-label={ariaLabel} title={title}>
      {children}
    </button>
  )
}
