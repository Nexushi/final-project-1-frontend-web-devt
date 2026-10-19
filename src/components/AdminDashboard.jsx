import { useEffect, useRef, useState } from 'react'
import { difficultyIsUsed, difficultyPayload, isAdmin, loadAdminData } from '../api/admin.js'

function DifficultyForm({ setting, busy, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ levelName: setting?.levelName || '',
    aiSpeed: setting?.aiSpeed ?? 200, ballSpeed: setting?.ballSpeed ?? 300,
    isActive: setting?.isActive ?? true }))
  const [error, setError] = useState('')
  function change(event) {
    const { name, value, type, checked } = event.target
    setForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }
  function submit(event) {
    event.preventDefault()
    try { const payload = difficultyPayload(form); setError(''); onSave(payload) }
    catch (err) { setError(err.message) }
  }
  return <form onSubmit={submit} className="admin-form">
    <h3>{setting ? `Edit ${setting.levelName}` : 'Create difficulty'}</h3>
    <label>Level name<input name="levelName" value={form.levelName} onChange={change} required maxLength={32} disabled={busy} /></label>
    <div className="admin-speeds">
      <label>AI speed (px/s)<input name="aiSpeed" type="number" min="1" max="2000" step="any" value={form.aiSpeed} onChange={change} required disabled={busy} /></label>
      <label>Ball speed (px/s)<input name="ballSpeed" type="number" min="1" max="2000" step="any" value={form.ballSpeed} onChange={change} required disabled={busy} /></label>
    </div>
    <label className="checkbox-label"><input name="isActive" type="checkbox" checked={form.isActive} onChange={change} disabled={busy} /> Active</label>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="button-row"><button className="primary" disabled={busy}>{setting ? 'Save difficulty' : 'Create difficulty'}</button>{setting && <button type="button" disabled={busy} onClick={onCancel}>Cancel edit</button>}</div>
  </form>
}

export default function AdminDashboard({ api, user, onForbidden, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState(null)
  const [formNumber, setFormNumber] = useState(0)
  const [confirmation, setConfirmation] = useState(null)
  const actionRef = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    let active = true
    mounted.current = true
    loadAdminData(api, user).then(result => { if (active) { setData(result); setError('') } })
      .catch(err => {
        if (!active) return
        setData(null)
        if (err.status === 403) onForbidden()
        else if (err.status !== 401) setError(err.message)
      }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; mounted.current = false }
  }, [api, user, onForbidden, attempt])

  async function mutate(request, update, success) {
    if (actionRef.current || !data || !isAdmin(user)) return
    actionRef.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const result = await request()
      if (!mounted.current) return
      setData(current => update(current, result))
      setConfirmation(null); setEditing(null); setFormNumber(number => number + 1)
      setMessage(success)
    } catch (err) {
      if (!mounted.current) return
      if (err.status === 403) { setData(null); onForbidden() }
      else if (err.status !== 401) {
        setError(!err.status ? 'Request not confirmed. Refresh the lists before retrying.' : err.message)
      }
    } finally {
      actionRef.current = false
      if (mounted.current) setBusy(false)
    }
  }
  function saveDifficulty(payload) {
    if (editing) {
      void mutate(() => api.adminUpdateDifficulty(editing.id, payload), (current, { difficulty }) => ({ ...current,
        difficulties: current.difficulties.map(item => item.id === difficulty.id ? difficulty : item) }), 'Difficulty updated.')
    } else {
      void mutate(() => api.adminCreateDifficulty(payload), (current, { difficulty }) => ({ ...current,
        difficulties: [...current.difficulties, difficulty] }), 'Difficulty created.')
    }
  }
  function confirmDelete() {
    if (!confirmation) return
    const { kind, id } = confirmation
    if (kind === 'user') {
      void mutate(() => api.adminDeleteUser(id), current => ({ ...current,
        users: current.users.filter(player => player.id !== id),
        matches: current.matches.filter(match => match.userId !== id) }), 'Player and their matches deleted.')
    } else {
      void mutate(() => api.adminDeleteDifficulty(id), current => ({ ...current,
        difficulties: current.difficulties.filter(level => level.id !== id) }), 'Unused difficulty deleted.')
    }
  }
  function refresh() {
    if (busy || loading) return
    setLoading(true); setData(null); setConfirmation(null); setEditing(null)
    setMessage(''); setError(''); setFormNumber(number => number + 1); setAttempt(number => number + 1)
  }

  if (!isAdmin(user)) return <section className="panel account-panel"><p role="alert">Admin access required.</p><button onClick={onBack}>Dashboard</button></section>
  const disabled = busy || loading
  return <section className="panel account-panel admin-panel">
    <p className="eyebrow">GROUP 1 · ADMIN</p><h1>Admin Dashboard</h1>
    <div className="button-row"><button disabled={disabled} onClick={refresh}>Refresh lists</button><button disabled={busy} onClick={onBack}>Player dashboard</button></div>
    {loading && <p role="status">Checking Admin access and loading records…</p>}
    {busy && <p role="status">Waiting for backend confirmation…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {confirmation && <div className="confirm-box" role="group" aria-label="Confirm deletion">
      <p>Delete {confirmation.kind === 'user' ? 'player' : 'difficulty'} <strong>{confirmation.label}</strong>?</p>
      <p>{confirmation.kind === 'user' ? 'This permanently deletes this player account and all their matches.' : 'Only unused settings can be deleted. Referenced settings must be deactivated instead.'} This cannot be undone.</p>
      <div className="button-row"><button disabled={disabled} onClick={confirmDelete}>Confirm delete</button><button disabled={disabled} onClick={() => setConfirmation(null)}>Cancel</button></div>
    </div>}
    {data && <>
      <section aria-labelledby="admin-users"><h2 id="admin-users">Users</h2><p className="small">Registered players only. Admin accounts are excluded by the backend.</p>
        <div className="table-scroll"><table><caption>Registered players</caption><thead><tr><th>Username</th><th>Player ID</th><th>Joined</th><th>Action</th></tr></thead><tbody>
          {data.users.map(player => <tr key={player.id}><td>{player.username}</td><td>{player.id}</td><td>{new Date(player.createdAt).toLocaleDateString()}</td><td><button disabled={disabled || !!confirmation || player.role !== 'PLAYER' || player.id === user.id} onClick={() => setConfirmation({ kind: 'user', id: player.id, label: player.username })}>Delete player</button></td></tr>)}
          {data.users.length === 0 && <tr><td colSpan="4">No registered players.</td></tr>}
        </tbody></table></div>
      </section>
      <section aria-labelledby="admin-matches"><h2 id="admin-matches">Matches</h2><p className="small">Read-only review of saved and completed matches.</p>
        <div className="table-scroll"><table><caption>Saved match records</caption><thead><tr><th>Match ID</th><th>Player</th><th>Difficulty</th><th>Player : AI</th><th>Status</th><th>Updated</th></tr></thead><tbody>
          {data.matches.map(match => <tr key={match.id}><td>{match.id}</td><td>{data.users.find(player => player.id === match.userId)?.username || match.userId}</td><td>{match.difficultySnapshot.levelName}</td><td>{match.playerScore} : {match.aiScore}</td><td>{match.status}</td><td>{new Date(match.updatedAt).toLocaleString()}</td></tr>)}
          {data.matches.length === 0 && <tr><td colSpan="6">No saved matches.</td></tr>}
        </tbody></table></div>
      </section>
      <section aria-labelledby="admin-difficulties"><h2 id="admin-difficulties">Difficulties</h2><p className="small">Changes affect future selections. Existing matches keep their saved difficulty snapshot. The backend checks all references before deletion.</p>
        <div className="table-scroll"><table><caption>All difficulty settings</caption><thead><tr><th>Name</th><th>AI px/s</th><th>Ball px/s</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {data.difficulties.map(level => <tr key={level.id}><td>{level.levelName}</td><td>{level.aiSpeed}</td><td>{level.ballSpeed}</td><td>{level.isActive ? 'Active' : 'Inactive'}</td><td><div className="button-row">
            <button disabled={disabled || !!confirmation} onClick={() => { setEditing(level); setFormNumber(number => number + 1) }}>Edit</button>
            <button disabled={disabled || !!confirmation} onClick={() => void mutate(() => api.adminUpdateDifficulty(level.id, { isActive: !level.isActive }), (current, { difficulty }) => ({ ...current, difficulties: current.difficulties.map(item => item.id === difficulty.id ? difficulty : item) }), level.isActive ? 'Difficulty deactivated.' : 'Difficulty activated.')}>{level.isActive ? 'Deactivate' : 'Activate'}</button>
            <button disabled={disabled || !!confirmation || difficultyIsUsed(data, level.id)} onClick={() => setConfirmation({ kind: 'difficulty', id: level.id, label: level.levelName })}>Delete</button>
          </div>{difficultyIsUsed(data, level.id) && <span className="small">In use — deactivate instead.</span>}</td></tr>)}
          {data.difficulties.length === 0 && <tr><td colSpan="5">No difficulty settings.</td></tr>}
        </tbody></table></div>
        <DifficultyForm key={formNumber} setting={editing} busy={disabled || !!confirmation} onSave={saveDifficulty} onCancel={() => { setEditing(null); setFormNumber(number => number + 1) }} />
      </section>
    </>}
  </section>
}
