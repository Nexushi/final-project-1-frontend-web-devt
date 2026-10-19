import { useEffect, useRef, useState } from 'react'
import { createGame, getMatchSummary, stepGame } from '../game/engine.js'
import { DIFFICULTIES, HEIGHT, WIDTH } from '../game/config.js'
import { drawGame } from '../game/render.js'

const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'KeyP', 'Escape'])

export default function GameCanvas({ difficulty, onRestart, onMenu }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const [view, setView] = useState(() => ({ ...getMatchSummary(createGame(difficulty)), message: 'Your serve — press Space' }))

  useEffect(() => {
    const game = createGame(difficulty)
    engineRef.current = game
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const keys = new Set()
    let swing = false
    let frameId
    let previousTime
    let lastView = ''
    function publish() {
      const nextView = { ...getMatchSummary(game), message: game.message }
      const serialized = JSON.stringify(nextView)
      if (serialized !== lastView) { lastView = serialized; setView(nextView) }
    }
    function clearInput() { keys.clear(); swing = false }
    function pauseOnBlur() {
      clearInput()
      if (game.phase !== 'over') { game.paused = true; publish() }
    }
    function keyDown(event) {
      if (!GAME_KEYS.has(event.code)) return
      // Preserve normal keyboard activation of React buttons.
      if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select')) return
      event.preventDefault()
      if (event.repeat) return
      if (event.code === 'KeyP' || event.code === 'Escape') {
        if (game.phase !== 'over') game.paused = !game.paused
        clearInput(); publish(); return
      }
      keys.add(event.code)
      if (event.code === 'Space' && !game.paused) swing = true
    }
    function keyUp(event) { keys.delete(event.code) }
    function visibilityChange() { if (document.hidden) pauseOnBlur() }
    function frame(time) {
      const dt = previousTime === undefined ? 0 : (time - previousTime) / 1000
      previousTime = time
      const pressed = (...codes) => codes.some(code => keys.has(code)) ? 1 : 0
      stepGame(game, {
        x: pressed('KeyD', 'ArrowRight') - pressed('KeyA', 'ArrowLeft'),
        y: pressed('KeyS', 'ArrowDown') - pressed('KeyW', 'ArrowUp'), swing,
      }, dt)
      swing = false
      drawGame(ctx, game)
      publish()
      frameId = requestAnimationFrame(frame)
    }
    canvas.focus()
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', pauseOnBlur)
    document.addEventListener('visibilitychange', visibilityChange)
    frameId = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', pauseOnBlur)
      document.removeEventListener('visibilitychange', visibilityChange)
      engineRef.current = null
    }
  }, [difficulty])

  function togglePause() {
    const game = engineRef.current
    if (game && game.phase !== 'over') {
      game.paused = !game.paused
      setView({ ...getMatchSummary(game), message: game.message })
      canvasRef.current.focus()
    }
  }

  return <section className="game panel">
    <div className="match-top"><div><h1>Pixel Court</h1><span className="small">{DIFFICULTIES[difficulty].label} · FIRST TO 5</span></div><div className="scoreboard" aria-label={`Player ${view.playerScore}, AI ${view.aiScore}`}><span>PLAYER <b>{view.playerScore}</b></span><span className="score-divider">:</span><span><b>{view.aiScore}</b> AI</span></div></div>
    <div className="court-wrap">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} aria-label="Pickleball court. You are at the bottom. Use WASD or arrows and Space." onPointerDown={() => canvasRef.current.focus()} />
      {(view.paused || view.phase === 'over') && <div className="overlay"><div className="overlay-card">
        <p className="eyebrow">{view.phase === 'over' ? 'MATCH COMPLETE' : 'TAKE A BREATHER'}</p>
        <h2>{view.phase === 'over' ? (view.winner === 'player' ? 'You win!' : 'AI wins!') : 'Paused'}</h2>
        <p>{view.phase === 'over' ? `${view.playerScore} – ${view.aiScore} · Nice match. Ready for another?` : 'Your match will wait right here.'}</p>
        <button className="primary" onClick={view.phase === 'over' ? onRestart : togglePause}>{view.phase === 'over' ? 'Play Again' : 'Resume'}</button>
        <button onClick={onMenu}>Main menu</button>
      </div></div>}
    </div>
    <p className="status" role="status">{view.paused && view.phase !== 'over' ? 'Paused — press P or Resume to continue.' : view.message}</p>
    <div className="game-actions"><button onClick={togglePause} disabled={view.phase === 'over'}>{view.paused ? 'Resume' : 'Pause'} <span>[P]</span></button><button onClick={onRestart}>Restart match</button><button onClick={onMenu}>Main menu</button></div>
  </section>
}
