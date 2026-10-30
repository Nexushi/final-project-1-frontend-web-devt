import { useEffect, useRef, useState } from 'react'

export default function ProfilePanel({ api, onUpdated, onDeleted, onBack }) {
  const [profile, setProfile] = useState(null)
  const [levels, setLevels] = useState([])
  const [username, setUsername] = useState('')
  const [preference, setPreference] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const actionRef = useRef(false)
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
    if (actionRef.current) return
    actionRef.current = true
    setBusy(true); setError(''); setMessage('')
    const changes = { username: username.trim() }
    // Keep an old inactive preference unless the player explicitly chooses another.
    if (preference !== (profile.preferredDifficultyId || '')) changes.preferredDifficultyId = preference || null
    try {
      const { user } = await api.updateProfile(changes)
      setProfile(user); setUsername(user.username); setPreference(user.preferredDifficultyId || '')
      onUpdated(user); setMessage('Profile saved to backend.')
    } catch (err) { setError(err.message) }
    finally { actionRef.current = false; setBusy(false) }
  }
  async function deleteAccount(event) {
    event.preventDefault()
    if (actionRef.current || !confirmDelete || confirmation !== 'DELETE') return
    actionRef.current = true
    setBusy(true); setDeleting(true); setError(''); setMessage('')
    try {
      await api.deleteProfile()
    } catch (err) {
      setError(`Account deletion was not confirmed. ${err.message}`)
      actionRef.current = false
      setBusy(false); setDeleting(false)
      return
    }
    onDeleted()
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
      <button className="primary" disabled={busy}>{busy && !deleting ? 'Saving…' : 'Save profile'}</button>
    </form>}
    {message && <p role="status">{message}</p>}
    {profile && <section className="danger-zone" aria-labelledby="danger-zone-title">
      <h2 id="danger-zone-title">Danger Zone</h2>
      <p>Deleting your account permanently removes your player profile and all saved matches and match history. This cannot be undone.</p>
      {!confirmDelete ? <button className="danger" disabled={busy} onClick={() => {
        setConfirmDelete(true); setConfirmation(''); setError(''); setMessage('')
      }}>Delete My Account</button> : <form className="confirm-box" onSubmit={deleteAccount} aria-busy={deleting}>
        <p id="delete-warning">Permanently delete your account and saved matches? Type DELETE below to confirm.</p>
        <label htmlFor="delete-confirmation">Type DELETE</label>
        <input id="delete-confirmation" aria-describedby="delete-warning" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" spellCheck={false} required pattern="DELETE" />
        <div className="button-row">
          <button className="danger" type="submit" disabled={busy || confirmation !== 'DELETE'}>{deleting ? 'Deleting…' : 'Permanently Delete My Account'}</button>
          <button type="button" disabled={busy} onClick={() => { setConfirmDelete(false); setConfirmation(''); setError('') }}>Cancel</button>
        </div>
        {deleting && <p role="status">Deleting your account… Please wait.</p>}
      </form>}
    </section>}
    <div className="button-row"><button disabled={busy} onClick={() => setAttempt(value => value + 1)}>Reload profile</button><button disabled={busy} onClick={onBack}>Dashboard</button></div>
  </section>
}
