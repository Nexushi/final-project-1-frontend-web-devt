import { useState } from 'react'
import GameCanvas from './components/GameCanvas'
import { DIFFICULTIES } from './game/config'
import './App.css'

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [difficulty, setDifficulty] = useState('easy')
  const [matchNumber, setMatchNumber] = useState(0)
  function startMatch(level = difficulty) {
    setDifficulty(level)
    setMatchNumber(number => number + 1)
    setScreen('game')
  }
  return (
    <main>
      <header><span className="brand">PB / PIXEL COURT</span><span>GROUP 1 · C3B</span></header>
      {screen === 'menu' && <section className="menu panel">
        <p className="eyebrow">A LITTLE COURT. A QUICK MATCH.</p>
        <div className="pixel-ball" aria-hidden="true">▦</div>
        <h1>Pickle Ball<br /><span>Pixel Game</span></h1>
        <p>Grab a paddle. Take on the computer.<br />First to five takes the match!</p>
        <button className="primary" onClick={() => setScreen('difficulty')}>Start Game →</button>
        <p className="small">SINGLE PLAYER · KEYBOARD CONTROLS</p>
      </section>}
      {screen === 'difficulty' && <section className="panel menu">
        <p className="eyebrow">SET UP YOUR MATCH</p><h1>Pick your pace</h1>
        <p>Every difficulty plays to five points.</p>
        <div className="difficulty-list">{Object.entries(DIFFICULTIES).map(([level, settings]) =>
          <button key={level} onClick={() => startMatch(level)}><strong>{settings.label}</strong><span>{settings.description}</span></button>
        )}</div>
        <button onClick={() => setScreen('menu')}>← Main menu</button>
      </section>}
      {screen === 'game' && <GameCanvas key={matchNumber} difficulty={difficulty} onRestart={() => startMatch()} onMenu={() => setScreen('menu')} />}
      <section className="instructions panel" aria-labelledby="controls-title">
        <h2 id="controls-title">HOW TO PLAY</h2>
        <div className="control-grid"><p><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd><br />Move on your half</p><p><kbd>SPACE</kbd><br />Serve / swing paddle</p><p><kbd>P</kbd> / <kbd>ESC</kbd><br />Pause / resume</p></div>
        <p>You're at the bottom. Follow the ball's ground shadow, let it bounce, then swing nearby. Tap a direction while swinging to aim left or right. Release Space between swings.</p>
        <p className="small">Arcade rules: rally scoring, first to 5, no win-by-two. One bounce before a return; a second bounce or an out ball is a fault. Kitchen restrictions and diagonal serves are simplified. Session only; no saved matches.</p>
      </section>
      <footer>Pickle Ball Pixel Game · Stage 2 classroom prototype</footer>
    </main>
  )
}
