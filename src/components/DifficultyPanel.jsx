import { useEffect, useState } from 'react'
import { mapDifficulty } from '../game/backendDifficulty.js'
import { DIFFICULTIES } from '../game/config.js'

export default function DifficultyPanel({ api, user, busy, onChoose, onBack }) {
  const [levels, setLevels] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    if (!user) return
    api.difficulties().then(({ difficulties }) => {
      const mapped = difficulties.filter(setting => setting.isActive).map(setting => ({ id: setting.id, ...mapDifficulty(setting) }))
      if (active) { setLevels(mapped); setError('') }
    }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [api, user, attempt])
  const choices = user ? levels : Object.entries(DIFFICULTIES).map(([level, settings]) => ({ ...settings, id: level, level }))
  return <section className="panel menu">
    <p className="eyebrow">SET UP YOUR MATCH</p><h1>Pick your pace</h1>
    <p>{user ? 'Choose an active backend difficulty. Your match will be saved.' : 'Offline practice. Scores will not be saved.'}</p>
    {user && !levels && !error && <p role="status">Loading active difficulties…</p>}
    {error && <div role="alert" className="error"><p>{error}</p><button onClick={() => setAttempt(value => value + 1)}>Retry loading</button></div>}
    {choices?.length === 0 && <p>No active difficulties are available. Ask the team to check backend settings.</p>}
    <div className="difficulty-list">{choices?.map(settings => <button disabled={busy} key={settings.id} onClick={() => onChoose(settings)}>
      <strong>{settings.label}</strong><span>{settings.description}</span>
      {user?.preferredDifficultyId === settings.id && <span className="preferred">Preferred</span>}
    </button>)}</div>
    <button disabled={busy} onClick={onBack}>← Back</button>
  </section>
}
