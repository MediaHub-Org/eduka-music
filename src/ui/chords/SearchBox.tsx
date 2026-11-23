import { forwardRef, useId, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ChordSpec } from '../../engine'
import { chordSymbol, parseChordQuery } from '../../engine'
import { useT } from '../../i18n'
import { chordLongName } from '../../i18n/text'
import { selectNotation } from '../../state/selectors'
import { useStore } from '../../state/store'

export interface SearchBoxProps {
  onPick: (spec: ChordSpec) => void
}

/** Buscador con resultados mientras se escribe (`parseChordQuery`). */
export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(function SearchBox({ onPick }, ref) {
  const m = useT()
  const notation = useStore(selectNotation)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const results = useMemo(() => (q.trim() ? parseChordQuery(q) : []), [q])
  const show = open && q.trim() !== ''

  const pick = (spec: ChordSpec, input: HTMLInputElement | null) => {
    onPick(spec)
    setQ('')
    setOpen(false)
    setActive(0)
    input?.blur()
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[Math.min(active, results.length - 1)]
      if (r) pick(r, e.currentTarget)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (q) setQ('')
      else e.currentTarget.blur()
      setOpen(false)
    }
  }

  return (
    <div className="search">
      <span className="search-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5L20 20" />
        </svg>
      </span>
      <input
        ref={ref}
        type="search"
        aria-label={m.searchLabel}
        placeholder={m.search}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
        value={q}
        aria-controls={show ? listId : undefined}
        aria-expanded={show}
        aria-activedescendant={show && results.length ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKey}
      />
      {show && (
        <ul className="search-res" role="listbox" id={listId} aria-label={m.searchLabel}>
          {results.length === 0 && <li className="search-none">{m.noResults}</li>}
          {results.map((spec, i) => (
            <li
              key={chordSymbol(spec, 'english')}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'on' : undefined}
              // mousedown para que el blur del input no cierre la lista antes del clic
              onMouseDown={(e) => {
                e.preventDefault()
                pick(spec, (e.currentTarget.closest('.search')?.querySelector('input') as HTMLInputElement) ?? null)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <b>{chordSymbol(spec, notation)}</b>
              <span>{chordLongName(spec, m, notation)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
