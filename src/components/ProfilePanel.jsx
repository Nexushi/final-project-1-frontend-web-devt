import { useEffect, useState } from 'react'

export default function ProfilePanel({ api, onUpdated, onBack }) {
  const [profile, setProfile] = useState(null)
  const [levels, setLevels] = useState([])
  const [username, setUsername] = useState('')
  const [preference, setPreference] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    Promise.all([api.profile(), api.difficulties()]).then(([{ user }, { difficulties }]) => {
      if (!active) return
      setProfile(user); setUsername(user.username); setPreference(user.preferredDifficultyId || '')
      setLevels(difficulties.filter(level => level.isActive)); setError('')
    }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [api, attempt])
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    const changes = { username: username.trim() }
    // Keep an old inactive preference unless the player explicitly chooses another.
    if (preference !== (profile.preferredDifficultyId || '')) changes.preferredDifficultyId = preference || null
    try {
      const { user } = await api.updateProfile(changes)
      setProfile(user); setUsername(user.username); setPreference(user.preferredDifficultyId || '')
      onUpdated(user); setMessage('Profile saved to backend.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <section className="panel account-panel"><h1>Profile settings</h1>
    {error && <p className="error" role="alert">{error}</p>}
    {!profile && !error && <p role="status">Loading profile…</p>}
    {profile && <form onSubmit={submit}>
      <label>Username<input required pattern="[a-zA-Z0-9_]{3,24}" minLength={3} maxLength={24} value={username} onChange={event => setUsername(event.target.value)} disabled={busy} autoComplete="username" /></label>
      <label>Preferred difficulty<select value={preference} onChange={event => setPreference(event.target.value)} disabled={busy}>
        <option value="">No preference</option>
        {preference && !levels.some(level => level.id === preference) && <option value={preference}>Previously selected (inactive)</option>}
        {levels.map(level => <option key={level.id} value={level.id}>{level.levelName}</option>)}
      </select></label>
      <p className="small">Account: {profile.username} · Joined {new Date(profile.createdAt).toLocaleDateString()}</p>
      <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
    </form>}
    {message && <p role="status">{message}</p>}
    <div className="button-row"><button disabled={busy} onClick={() => setAttempt(value => value + 1)}>Reload profile</button><button disabled={busy} onClick={onBack}>Dashboard</button></div>
  </section>
}
