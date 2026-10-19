import { useEffect, useRef, useState } from 'react'
import { createGame, getMatchSummary, stepGame } from '../game/engine.js'
import { DIFFICULTIES, HEIGHT, WIDTH } from '../game/config.js'
import { drawGame } from '../game/render.js'

const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'KeyP', 'Escape'])

export default function GameCanvas({ difficulty, settings = DIFFICULTIES[difficulty], savedMatch = null,
  saver = null, onReload, onRestart, onMenu }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const retryRef = useRef(null)
  const [reloadError, setReloadError] = useState('')
  const [reloading, setReloading] = useState(false)
  const [view, setView] = useState(() => ({
    ...getMatchSummary(createGame(difficulty, settings, savedMatch)), message: 'Your serve — press Space',
    saveMessage: saver ? 'Your saved progress is ready.' : 'Offline practice — progress is not saved.',
    saveError: '', saveBusy: false, conflict: false, version: savedMatch?.version,
  }))

  useEffect(() => {
    const game = createGame(difficulty, settings, savedMatch)
    Object.assign(game, { saveMessage: saver ? 'Your saved progress is ready.' : 'Offline practice — progress is not saved.',
      saveError: '', saveBusy: false, conflict: false, version: savedMatch?.version })
    engineRef.current = game
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const keys = new Set()
    let swing = false
    let frameId
    let previousTime
    let lastView = ''
    let lastCheckpoint = ''
    let active = true
    function publish() {
      if (!active) return
      const nextView = { ...getMatchSummary(game), message: game.message,
        saveMessage: game.saveMessage, saveError: game.saveError, saveBusy: game.saveBusy,
        conflict: game.conflict, version: game.version }
      const serialized = JSON.stringify(nextView)
      if (serialized !== lastView) { lastView = serialized; setView(nextView) }
    }
    function clearInput() { keys.clear(); swing = false }
    async function savePoint() {
      if (!saver || game.saveBusy) return
      game.saving = true; game.saveBusy = true; game.saveError = ''
      game.saveMessage = 'Saving point…'; clearInput(); publish()
      try {
        const record = await saver.save(getMatchSummary(game))
        if (!active) return
        game.version = record.version
        game.saveMessage = `Progress saved: ${record.playerScore} – ${record.aiScore}${record.status === 'COMPLETED' ? ' · Match completed' : ''}.`
        game.saving = false
      } catch (err) {
        if (!active) return
        game.conflict = err.status === 409
        game.saveError = err.message
        game.saveMessage = 'Progress not confirmed. Gameplay is waiting at this point.'
        // Leave game.saving true. A failed save cannot silently advance to another point.
      } finally {
        if (active) { game.saveBusy = false; publish() }
      }
    }
    retryRef.current = savePoint
    function pauseOnBlur() {
      clearInput()
      if (game.phase !== 'over') { game.paused = true; publish() }
    }
    function keyDown(event) {
      if (!GAME_KEYS.has(event.code)) return
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select')) return
      event.preventDefault()
      if (event.repeat) return
      if (event.code === 'KeyP' || event.code === 'Escape') {
        if (game.phase !== 'over') game.paused = !game.paused
        clearInput(); publish(); return
      }
      if (game.saving) return
      keys.add(event.code)
      if (event.code === 'Space' && !game.paused) swing = true
    }
    function keyUp(event) { keys.delete(event.code) }
    function visibilityChange() { if (document.hidden) pauseOnBlur() }
    function beforeUnload(event) {
      if (game.saving) { event.preventDefault(); event.returnValue = '' }
    }
    function frame(time) {
      const dt = previousTime === undefined ? 0 : (time - previousTime) / 1000
      previousTime = time
      const pressed = (...codes) => codes.some(code => keys.has(code)) ? 1 : 0
      stepGame(game, { x: pressed('KeyD', 'ArrowRight') - pressed('KeyA', 'ArrowLeft'),
        y: pressed('KeyS', 'ArrowDown') - pressed('KeyW', 'ArrowUp'), swing }, dt)
      swing = false
      if (saver && (game.phase === 'point' || game.phase === 'over')) {
        const checkpoint = `${game.scores.player}:${game.scores.ai}:${game.status}`
        if (checkpoint !== lastCheckpoint) { lastCheckpoint = checkpoint; void savePoint() }
      }
      drawGame(ctx, game); publish()
      frameId = requestAnimationFrame(frame)
    }
    canvas.focus()
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', pauseOnBlur)
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', visibilityChange)
    frameId = requestAnimationFrame(frame)
    return () => {
      active = false; cancelAnimationFrame(frameId)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', pauseOnBlur)
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('visibilitychange', visibilityChange)
      engineRef.current = null; retryRef.current = null
    }
  }, [difficulty, settings, savedMatch, saver])

  function togglePause() {
    const game = engineRef.current
    if (game && game.phase !== 'over') {
      game.paused = !game.paused
      setView(current => ({ ...current, ...getMatchSummary(game), message: game.message }))
      canvasRef.current.focus()
    }
  }
  function leave(action) {
    if (view.saveBusy || reloading) return
    if (view.saveError && !window.confirm('This point is not confirmed saved. Leave and keep only your last saved progress?')) return
    action()
  }
  async function reloadServerMatch() {
    if (reloading) return
    setReloading(true); setReloadError('')
    try { await onReload(savedMatch.id) }
    catch (err) { setReloadError(err.message) }
    finally { setReloading(false) }
  }
  const busy = view.saveBusy || reloading
  return <section className="game panel">
    <div className="match-top"><div><h1>Pixel Court</h1><span className="small">{settings.label} · FIRST TO 5</span></div><div className="scoreboard" aria-label={`Player ${view.playerScore}, AI ${view.aiScore}`}><span>PLAYER <b>{view.playerScore}</b></span><span className="score-divider">:</span><span><b>{view.aiScore}</b> AI</span></div></div>
    <div className="court-wrap">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} aria-label="Pickleball court. You are at the bottom. Use WASD or arrows and Space." onPointerDown={() => canvasRef.current.focus()} />
      {(view.paused || view.phase === 'over') && <div className="overlay"><div className="overlay-card">
        <p className="eyebrow">{view.phase === 'over' ? 'MATCH COMPLETE' : 'TAKE A BREATHER'}</p>
        <h2>{view.phase === 'over' ? (view.winner === 'player' ? 'You win!' : 'AI wins!') : 'Paused'}</h2>
        <p>{view.phase === 'over' ? `${view.playerScore} – ${view.aiScore} · Nice match. Ready for another?` : 'Your match will wait right here.'}</p>
        <button className="primary" disabled={busy} onClick={view.phase === 'over' ? () => leave(onRestart) : togglePause}>{view.phase === 'over' ? 'Play Again' : 'Resume'}</button>
        <button disabled={busy} onClick={() => leave(onMenu)}>{saver ? 'Dashboard' : 'Main menu'}</button>
      </div></div>}
    </div>
    <p className="status" role="status">{view.paused && view.phase !== 'over' ? 'Paused — press P or Resume to continue.' : view.message}</p>
    <div className="save-panel" aria-live="polite">
      <p>{view.saveMessage}</p>
      {savedMatch && <p className="small">Player serves first after loading</p>}
      {view.saveError && <div className="error"><p role="alert">{view.saveError}</p><div className="button-row">
        {!view.conflict && <button disabled={busy} onClick={() => retryRef.current?.()}>Retry save</button>}
        <button disabled={busy} onClick={reloadServerMatch}>Discard local point &amp; load server match</button>
      </div></div>}
      {reloadError && <p role="alert" className="error">{reloadError}</p>}
    </div>
    <div className="game-actions"><button onClick={togglePause} disabled={view.phase === 'over'}>{view.paused ? 'Resume' : 'Pause'} <span>[P]</span></button><button disabled={busy} onClick={() => leave(onRestart)}>Restart match</button><button disabled={busy} onClick={() => leave(onMenu)}>{saver ? 'Dashboard' : 'Main menu'}</button></div>
  </section>
}
