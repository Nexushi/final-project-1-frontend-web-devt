import { useCallback, useEffect, useRef, useState } from 'react'
import GameCanvas from './components/GameCanvas'
import AuthForm from './components/AuthForm'
import DifficultyPanel from './components/DifficultyPanel'
import MatchesPanel from './components/MatchesPanel'
import ProfilePanel from './components/ProfilePanel'
import RulesGuide from './components/RulesGuide'
import AdminDashboard from './components/AdminDashboard'
import AdminNavigation from './components/AdminNavigation.js'
import { isAdmin } from './api/admin.js'
import { createMatchSaver } from './api/matchSaver.js'
import { readToken, createSessionConnection } from './api/session.js'
import { mapDifficulty } from './game/backendDifficulty.js'
import './App.css'

export default function App() {
  const [initialToken] = useState(readToken)
  const [screen, setScreen] = useState(initialToken ? 'checking' : 'menu')
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [creationUnknown, setCreationUnknown] = useState(false)
  const [adminDenied, setAdminDenied] = useState(false)
  const actionRef = useRef(false)
  const matchNumber = useRef(0)
  const [connection] = useState(() => createSessionConnection(initialToken,
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', () => {
      setUser(null); setSession(null)
      setNotice('Your session expired or is no longer valid. Please log in again. Unsaved points were not confirmed.')
      setScreen('login')
    }))
  const api = connection.api
  const adminForbidden = useCallback(() => {
    setAdminDenied(true)
    setNotice('Admin access denied. Sign in again to recheck your role.')
    setScreen('dashboard')
  }, [])

  useEffect(() => {
    if (!initialToken || !api) return
    let active = true
    api.profile().then(({ user: profile }) => {
      if (active) { setUser(profile); setScreen('dashboard') }
    }).catch(err => {
      if (active && err.status !== 401) { setNotice(err.message); setScreen('checking-error') }
    })
    return () => { active = false }
  }, [api, initialToken])

  function authenticated({ token, user: profile }) {
    connection.setToken(token); setUser(profile)
    setCreationUnknown(false)
    setAdminDenied(false)
    setNotice(''); setScreen('dashboard')
  }
  function logout() {
    connection.setToken(null); setUser(null); setSession(null); setCreationUnknown(false)
    setNotice('Logged out.'); setScreen('menu')
  }
  function openMatch(record, settings) {
    matchNumber.current += 1
    setSession({ key: matchNumber.current, record, settings,
      saver: record ? createMatchSaver(api, record) : null })
    setNotice(''); setScreen('game')
  }
  async function startMatch(settings) {
    if (actionRef.current || creationUnknown) return
    if (!user) { openMatch(null, settings); return }
    actionRef.current = true; setBusy(true); setNotice('Creating match on backend…')
    try {
      const { match } = await api.createMatch(settings.id)
      openMatch(match, mapDifficulty(match.difficultySnapshot))
    } catch (err) {
      if (!err.status || err.status >= 500) setCreationUnknown(true)
      setNotice(`${err.message} If creation timed out, check Saved Matches before trying again; the server may have created the record.`)
    } finally { actionRef.current = false; setBusy(false) }
  }
  async function resumeMatch(id) {
    const { match } = await api.match(id)
    if (match.status !== 'IN_PROGRESS') {
      setNotice('This match has completed. View it in Match History.'); setScreen('history'); return
    }
    openMatch(match, mapDifficulty(match.difficultySnapshot))
  }
  function returnFromGame() { setSession(null); setScreen(user ? 'dashboard' : 'menu') }
  function restartGame() {
    // Saved scores cannot decrease: every restart creates a fresh backend record.
    if (user) { setSession(null); setScreen('difficulty'); setNotice('Choose a difficulty for a new match. The previous record remains in Saved Matches or History.') }
    else openMatch(null, session.settings)
  }

  if (connection.error) return <main><section className="panel account-panel"><h1>Check API configuration</h1><p role="alert" className="error">{connection.error}</p><p>Correct VITE_API_BASE_URL in .env.local, then restart Vite.</p></section></main>

  return <main>
    <header><span className="brand">PB / PIXEL COURT</span><span>GROUP 1 · C3B</span></header>
    {notice && <p className="notice" role="status">{notice}</p>}
    {screen === 'checking' && <section className="panel menu"><p>Checking your session…</p></section>}
    {screen === 'checking-error' && <section className="panel menu"><h1>Backend unavailable</h1><p>Your session could not be checked.</p><div className="button-row"><button onClick={() => window.location.reload()}>Retry</button><button onClick={logout}>Clear session / main menu</button></div></section>}
    {screen === 'menu' && <section className="menu panel">
      <p className="eyebrow">A LITTLE COURT. A QUICK MATCH.</p><div className="pixel-ball" aria-hidden="true">▦</div>
      <h1>Pickle Ball<br /><span>Pixel Game</span></h1>
      <p>Grab a paddle. Take on the computer.<br />First to five takes the match!</p>
      <button className="primary" onClick={() => setScreen(user ? 'dashboard' : 'difficulty')}>Start Game →</button>
      <div className="button-row">{user ? <button onClick={() => setScreen('dashboard')}>Player Dashboard</button> : <><button onClick={() => { setNotice(''); setScreen('login') }}>Login</button><button onClick={() => { setNotice(''); setScreen('register') }}>Register</button></>}</div>
      <p className="small">{user ? `Signed in as ${user.username}` : 'Start Game is offline practice. Log in to save matches.'}</p>
    </section>}
    {['login', 'register'].includes(screen) && <AuthForm key={screen} mode={screen} api={api} onAuthenticated={authenticated} onBack={() => setScreen('menu')} />}
    {screen === 'dashboard' && user && <section className="panel menu">
      <p className="eyebrow">PLAYER DASHBOARD</p><h1>Hello, {user.username}</h1>
      <p>Your court is ready. Play a match or pick up a saved score.</p>
      <div className="dashboard-buttons"><button className="primary" onClick={() => { setNotice(''); setScreen('difficulty') }}>Play Game</button><button onClick={() => { setNotice(''); setScreen('saved') }}>Saved Matches</button><button onClick={() => { setNotice(''); setScreen('history') }}>Match History</button><button onClick={() => { setNotice(''); setScreen('profile') }}>Profile settings</button><button onClick={logout}>Logout</button><button onClick={() => setScreen('menu')}>Main menu</button></div>
      <AdminNavigation user={adminDenied ? null : user} onOpen={() => { setNotice(''); setScreen('admin') }} />
    </section>}
    {screen === 'difficulty' && <><DifficultyPanel api={api} user={user} busy={busy || creationUnknown} onChoose={startMatch} onBack={() => { setNotice(''); setScreen(user ? 'dashboard' : 'menu') }} />
      {creationUnknown && <section className="panel account-panel"><p>Creation was not confirmed. Check Saved Matches before creating another match.</p><button onClick={() => { setCreationUnknown(false); setScreen('saved') }}>Check Saved Matches</button></section>}</>}
    {['saved', 'history'].includes(screen) && user && <MatchesPanel key={screen} api={api} history={screen === 'history'} onResume={resumeMatch} onBack={() => setScreen('dashboard')} />}
    {screen === 'profile' && user && <ProfilePanel api={api} onUpdated={setUser} onBack={() => setScreen('dashboard')} />}
    {screen === 'admin' && isAdmin(user) && !adminDenied && <AdminDashboard api={api} user={user} onForbidden={adminForbidden} onBack={() => setScreen('dashboard')} />}
    {screen === 'game' && session && <GameCanvas key={session.key} difficulty={session.settings.level} settings={session.settings} savedMatch={session.record} saver={session.saver} onReload={resumeMatch} onRestart={restartGame} onMenu={returnFromGame} />}
    <section className="instructions panel" aria-labelledby="controls-title">
      <h2 id="controls-title">HOW TO PLAY</h2>
      <div className="control-grid"><p><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd><br />Move on your half</p><p><kbd>SPACE</kbd><br />Serve / swing paddle</p><p><kbd>P</kbd> / <kbd>ESC</kbd><br />Pause / resume</p></div>
      <p>You're at the bottom. Press Space from your automatic service position to serve diagonally. During rallies, follow the ball's ground shadow, let it bounce, then swing nearby. Tap a direction while swinging to aim left or right. Release Space between swings.</p>
      <p className="small">First to 5 with rally scoring. Logged-in matches save between points; resuming starts a fresh rally at the saved scores.</p>
      <RulesGuide />
    </section>
    <footer>Pickle Ball Pixel Game · Group 1 · Single-player</footer>
  </main>
}
