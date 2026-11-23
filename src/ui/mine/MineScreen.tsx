import { useRef, useState } from 'react'
import { chordSymbol } from '../../engine'
import { useT } from '../../i18n'
import { applyImport, exportData, parseImport } from '../../state/persist'
import { useStore } from '../../state/store'
import type { Favorite, SavedProgression } from '../../state/store'
import type { ImportData } from '../../state/persist'
import { setPendingPracticeSource } from '../practice/source'
import { ProgressionEditor } from './ProgressionEditor'

function goTo(hash: string) {
  window.location.hash = hash
}

export function MineScreen() {
  const m = useT()
  const settings = useStore((s) => s.settings)
  const favorites = useStore((s) => s.favorites)
  const progressions = useStore((s) => s.progressions)
  const [editing, setEditing] = useState<SavedProgression | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<SavedProgression | null>(null)
  const [pendingImport, setPendingImport] = useState<ImportData | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const chooseFavorite = (favorite: Favorite) => {
    const state = useStore.getState()
    state.setInstrument(favorite.instrument)
    state.setSettings({ capo: favorite.capo })
    state.selectChord(favorite.chord, favorite.positionKey)
    goTo('#/acordes')
  }

  const saveProgression = (progression: Omit<SavedProgression, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    useStore.getState().saveProgression(progression)
    setEditing(undefined)
  }

  const practiceProgression = (id: string) => {
    setPendingPracticeSource({ kind: 'saved', id })
    goTo('#/practicar')
  }

  const exportBackup = () => {
    try {
      const json = exportData(useStore.getState())
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `eduka-music-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setImportError(m.mine.backupError)
    }
  }

  const readBackup = async (file?: File) => {
    setImportError(null)
    setPendingImport(null)
    if (!file) return
    try {
      const result = parseImport(await file.text())
      if (!result.ok) {
        setImportError(m.importErrors[result.error])
        return
      }
      setPendingImport(result.data)
    } catch {
      setImportError(m.mine.backupError)
    }
  }

  const confirmImport = () => {
    if (!pendingImport) return
    useStore.setState((current) => ({ ...current, ...applyImport(current, pendingImport) }))
    setPendingImport(null)
  }

  return (
    <div className="screen mine">
      <header className="mine-title">
        <div>
          <p className="eyebrow">Eduka Music</p>
          <h1>{m.navMine}</h1>
        </div>
        <button type="button" className="mine-primary" onClick={() => setEditing(null)}>{m.mine.newProgression}</button>
      </header>

      {editing !== undefined ? (
        <ProgressionEditor initial={editing ?? undefined} onSave={saveProgression} onCancel={() => setEditing(undefined)} />
      ) : (
        <>
          <section className="mine-section" aria-labelledby="mine-favorites-title">
            <div className="mine-section-hd">
              <h2 id="mine-favorites-title">{m.favorites}</h2>
              <span className="mine-count">{favorites.length}</span>
            </div>
            {favorites.length === 0 ? (
              <p className="note mine-empty">{m.mine.emptyFavorites}</p>
            ) : (
              <div className="mine-favorites" data-testid="favorites">
                {favorites.map((favorite) => {
                  const symbol = chordSymbol(favorite.chord, settings.notation)
                  const instrument = m.inst[favorite.instrument]
                  return (
                    <article className="mine-favorite" key={favorite.id}>
                      <button type="button" className="mine-fav-pick" aria-label={`${symbol} · ${instrument}`} onClick={() => chooseFavorite(favorite)}>
                        <b>{symbol}</b>
                        <span>{instrument}{favorite.capo ? ` · ${m.capo} ${favorite.capo}` : ''}</span>
                      </button>
                      <button
                        type="button"
                        className="mine-fav-remove"
                        aria-label={m.mine.favoriteRemove(symbol)}
                        title={m.mine.favoriteRemove(symbol)}
                        onClick={() => useStore.getState().toggleFavorite(favorite)}
                      >
                        ×
                      </button>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="mine-section" aria-labelledby="mine-progressions-title">
            <div className="mine-section-hd">
              <h2 id="mine-progressions-title">{m.savedProgressions}</h2>
              <span className="mine-count">{progressions.length}</span>
            </div>
            {progressions.length === 0 ? (
              <p className="note mine-empty">{m.mine.emptyProgressions}</p>
            ) : (
              <ol className="mine-progressions">
                {progressions.map((progression, index) => (
                  <li className="mine-progression" key={progression.id}>
                    <div className="mine-prog-info">
                      <h3>{progression.name}</h3>
                      <p>{progression.items.map((item) => chordSymbol(item.chord, settings.notation)).join(' · ')}</p>
                      <small>{progression.timeSignature} · {progression.bpm} {m.mine.bpm}</small>
                    </div>
                    <div className="mine-prog-actions">
                      <button type="button" className="mine-primary" onClick={() => practiceProgression(progression.id)}>{m.mine.practice}</button>
                      <button type="button" onClick={() => setEditing(progression)}>{m.mine.edit}</button>
                      <button type="button" aria-label={`${m.mine.delete} ${progression.name}`} onClick={() => setDeleting(progression)}>{m.mine.delete}</button>
                      <button type="button" aria-label={`${m.mine.moveUp} ${progression.name}`} disabled={index === 0} onClick={() => useStore.getState().moveProgression(progression.id, index - 1)}>↑</button>
                      <button type="button" aria-label={`${m.mine.moveDown} ${progression.name}`} disabled={index === progressions.length - 1} onClick={() => useStore.getState().moveProgression(progression.id, index + 1)}>↓</button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="mine-section mine-backup" aria-label={m.exportData}>
            <button type="button" onClick={exportBackup}>{m.mine.export}</button>
            <button type="button" onClick={() => fileInput.current?.click()}>{m.mine.import}</button>
            <input
              ref={fileInput}
              className="sr"
              type="file"
              accept="application/json,.json"
              aria-label={m.importData}
              onChange={(event) => {
                void readBackup(event.target.files?.[0])
                event.currentTarget.value = ''
              }}
            />
          </section>
        </>
      )}

      {deleting && (
        <div className="mine-confirm-backdrop">
          <section className="mine-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-progression-title">
            <h2 id="delete-progression-title">{m.mine.delete} «{deleting.name}»?</h2>
            <div className="mine-actions">
              <button type="button" onClick={() => setDeleting(null)}>{m.mine.cancelDelete}</button>
              <button type="button" className="mine-danger" onClick={() => {
                useStore.getState().deleteProgression(deleting.id)
                setDeleting(null)
              }}>{m.mine.confirmDelete}</button>
            </div>
          </section>
        </div>
      )}

      {pendingImport && (
        <div className="mine-confirm-backdrop">
          <section className="mine-confirm" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <h2 id="import-title">{m.mine.importTitle}</h2>
            <p>{m.mine.importConfirm(pendingImport.favorites.length, pendingImport.progressions.length)}</p>
            <div className="mine-actions">
              <button type="button" onClick={() => setPendingImport(null)}>{m.mine.cancelImport}</button>
              <button type="button" className="mine-primary" onClick={confirmImport}>{m.mine.confirmImport}</button>
            </div>
          </section>
        </div>
      )}
      {importError && <p className="mine-toast" role="alert">{importError}</p>}
    </div>
  )
}
