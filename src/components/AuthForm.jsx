import { useState } from 'react'

export default function AuthForm({ mode, api, onAuthenticated, onBack }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) {
      setError('Username must be 3–24 letters, numbers, or underscores.'); return
    }
    if (password.length < 8 || !password.trim() || new TextEncoder().encode(password).length > 72) {
      setError('Password must be at least 8 characters and at most 72 UTF-8 bytes.'); return
    }
    setBusy(true); setError('')
    try {
      const result = await api[mode]({ username: username.trim(), password })
      if (!result.token || !result.user?.username) throw new Error('Invalid authentication response from backend.')
      onAuthenticated(result)
    } catch (err) { setError(err.message) }
    finally { setBusy(false); setPassword('') }
  }
  return <section className="panel account-panel">
    <p className="eyebrow">PLAYER ACCOUNT</p><h1>{mode === 'register' ? 'Register' : 'Login'}</h1>
    <form onSubmit={submit}>
      <label>Username<input value={username} onChange={event => setUsername(event.target.value)} required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" autoComplete="username" disabled={busy} /></label>
      <p className="small">3–24 letters, numbers, or underscores. Usernames are stored in lowercase.</p>
      <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} disabled={busy} /></label>
      <p className="small">At least 8 characters, at most 72 UTF-8 bytes. Passwords are sent only to the configured backend and are never saved by this frontend.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="button-row"><button className="primary" disabled={busy}>{busy ? 'Connecting…' : mode === 'register' ? 'Create account' : 'Login'}</button><button type="button" disabled={busy} onClick={onBack}>Main menu</button></div>
    </form>
  </section>
}
