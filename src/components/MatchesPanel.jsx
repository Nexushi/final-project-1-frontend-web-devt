import { useEffect, useState } from 'react'

export default function MatchesPanel({ api, history, onResume, onBack }) {
  const [matches, setMatches] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [confirmId, setConfirmId] = useState(null)
  useEffect(() => {
    let active = true
    api.matches().then(result => { if (active) { setMatches(result.matches); setError('') } })
      .catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [api, attempt])
  async function remove(id) {
    if (busy) return
    setBusy(true); setError('')
    try {
      await api.deleteMatch(id)
      setMatches(current => current.filter(match => match.id !== id)); setConfirmId(null)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  async function resume(id) {
    if (busy) return
    setBusy(true); setError('')
    try { await onResume(id) } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const visible = matches?.filter(match => history ? match.status === 'COMPLETED' : match.status === 'IN_PROGRESS')
  return <section className="panel account-panel">
    <h1>{history ? 'Match History' : 'Saved Matches'}</h1>
    <p>{history ? 'Completed matches from your account.' : 'Resume at the saved score with a fresh rally.'}</p>
    {error && <p className="error" role="alert">{error}</p>}
    {!matches && !error && <p role="status">Loading matches…</p>}
    {visible?.length === 0 && <p>No {history ? 'completed' : 'unfinished'} matches yet.</p>}
    <div className="match-list">{visible?.map(match => <article className="match-record" key={match.id}>
      <h2>{match.difficultySnapshot.levelName} · Player {match.playerScore} : {match.aiScore} AI</h2>
      <p className="small">{match.status === 'COMPLETED' ? (match.playerScore === 5 ? 'Player won' : 'AI won') : 'In progress'} · {new Date(match.updatedAt).toLocaleString()} · Version {match.version}</p>
      <p className="small">Match ID: {match.id}</p>
      {confirmId === match.id ? <div className="confirm-box"><p>Delete this match permanently? This cannot be undone.</p><div className="button-row"><button disabled={busy} onClick={() => remove(match.id)}>Confirm delete</button><button disabled={busy} onClick={() => setConfirmId(null)}>Cancel</button></div></div> :
        <div className="button-row">{!history && <button className="primary" disabled={busy} onClick={() => resume(match.id)}>Resume match</button>}<button disabled={busy} onClick={() => setConfirmId(match.id)}>Delete match</button></div>}
    </article>)}</div>
    <div className="button-row"><button disabled={busy} onClick={() => setAttempt(value => value + 1)}>Refresh</button><button disabled={busy} onClick={onBack}>Dashboard</button></div>
  </section>
}
