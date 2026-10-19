import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGame, stepGame, updateBall, canReturn, getMatchSummary } from '../src/game/engine.js'
import { awardPoint } from '../src/game/scoring.js'
import { COURT, DIFFICULTIES } from '../src/game/config.js'

const idle = { x: 0, y: 0, swing: false }
const tick = (game, count, input = idle, random = () => 0.5) => {
  for (let i = 0; i < count; i++) stepGame(game, input, 1 / 60, random)
}

test('movement is normalized, bounded, and paused input changes nothing', () => {
  const a = createGame('easy'), b = createGame('easy')
  tick(a, 10, { ...idle, x: 1 })
  tick(b, 10, { ...idle, x: 1, y: -1 })
  assert.ok(Math.abs(Math.hypot(b.player.x - 320, b.player.y - 440) - (a.player.x - 320)) < 0.001)
  tick(a, 600, { ...idle, x: 1, y: -1 })
  assert.equal(a.player.x, COURT.right - 16)
  assert.equal(a.player.y, COURT.net + 24)
  a.paused = true
  const before = JSON.stringify(a)
  tick(a, 500, { x: -1, y: 1, swing: true })
  assert.equal(JSON.stringify(a), before)
})

test('serve crosses net, AI moves and returns; player must wait for bounce and range', () => {
  const game = createGame('medium')
  stepGame(game, { ...idle, swing: true }, 1 / 60, () => 0.8)
  assert.equal(game.phase, 'rally')
  assert.equal(canReturn(game, 'ai'), false)
  const initialX = game.ai.x
  for (let i = 0; i < 300 && game.ball.lastHit !== 'ai'; i++) tick(game, 1, idle, () => 0.8)
  assert.notEqual(game.ai.x, initialX)
  assert.equal(game.ball.lastHit, 'ai')
  assert.ok(game.ball.y < COURT.net)
  for (let i = 0; i < 300 && !game.ball.bounced; i++) tick(game, 1)
  Object.assign(game.player, { x: game.ball.x, y: game.ball.y })
  assert.equal(canReturn(game, 'player'), true)
  stepGame(game, { ...idle, swing: true }, 1 / 60, () => 0.8)
  assert.equal(game.ball.lastHit, 'player')
  assert.equal(game.ball.bounced, false)
})

test('out fault awards receiver exactly once; missed return awards hitter', () => {
  const game = createGame('easy')
  Object.assign(game.player, { x: 520 })
  stepGame(game, { ...idle, x: 1, swing: true }, 1 / 60)
  for (let i = 0; i < 400 && game.phase === 'rally'; i++) tick(game, 1)
  assert.equal(game.scores.ai, 1)
  assert.equal(game.phase, 'point')
  for (let i = 0; i < 100; i++) { updateBall(game, 1); awardPoint(game, 'ai', 'duplicate') }
  assert.equal(game.scores.ai, 1)
  tick(game, 100)
  assert.equal(game.server, 'ai')
  assert.equal(game.phase, 'serve')
  tick(game, 60)
  assert.equal(game.ball.lastHit, 'ai')
  tick(game, 300)
  assert.equal(game.scores.ai, 2)
})

test('first to five ends match, freezes engine, and produces completed summary', () => {
  for (const winner of ['player', 'ai']) {
    const game = createGame('hard')
    for (let point = 0; point < 5; point++) {
      game.phase = 'rally'
      awardPoint(game, winner, 'miss')
      awardPoint(game, winner, 'duplicate')
      assert.equal(game.scores[winner], point + 1)
    }
    assert.equal(game.phase, 'over')
    assert.equal(game.winner, winner)
    assert.equal(getMatchSummary(game).status, 'COMPLETED')
    const before = JSON.stringify(game)
    tick(game, 1000, { x: 1, y: 1, swing: true })
    assert.equal(JSON.stringify(game), before)
  }
})

test('difficulty parameters increase challenge and all levels can miss', () => {
  assert.ok(DIFFICULTIES.easy.speed < DIFFICULTIES.medium.speed)
  assert.ok(DIFFICULTIES.medium.speed < DIFFICULTIES.hard.speed)
  assert.ok(DIFFICULTIES.easy.reaction > DIFFICULTIES.hard.reaction)
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const game = createGame(difficulty)
    stepGame(game, { ...idle, swing: true }, 1 / 60, () => 0)
    tick(game, 250, idle, () => 0)
    assert.equal(game.scores.player, 1)
    assert.ok(game.ai.x >= COURT.left + 16 && game.ai.x <= COURT.right - 16)
    assert.ok(game.ai.y >= COURT.top + 20 && game.ai.y <= COURT.net - 24)
  }
})

test('100 simulated matches complete without duplicate points or invalid coordinates', () => {
  let seed = 12345
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let match = 0; match < 100; match++) {
    const game = createGame(Object.keys(DIFFICULTIES)[match % 3])
    for (let frame = 0; frame < 36000 && game.phase !== 'over'; frame++) {
      const prev = game.scores.player + game.scores.ai
      const dx = game.ball.x - game.player.x
      const dy = game.ball.y + 15 - game.player.y
      stepGame(game, { x: Math.abs(dx) > 5 ? Math.sign(dx) : 0, y: Math.abs(dy) > 5 ? Math.sign(dy) : 0,
        swing: game.phase === 'serve' || (canReturn(game, 'player') && frame % 12 === 0) }, 1 / 60, random)
      assert.ok(game.scores.player + game.scores.ai - prev <= 1)
      assert.ok(Number.isFinite(game.ball.x) && Number.isFinite(game.ball.y))
    }
    assert.equal(game.phase, 'over')
    assert.equal(Math.max(game.scores.player, game.scores.ai), 5)
  }
})

test('pause freezes an active ball and the between-point countdown', () => {
  const game = createGame('easy')
  stepGame(game, { ...idle, swing: true }, 1 / 60)
  tick(game, 20)
  game.paused = true
  const rally = JSON.stringify(game)
  tick(game, 1000)
  assert.equal(JSON.stringify(game), rally)
  game.paused = false
  awardPoint(game, 'player', 'test fault')
  game.paused = true
  const point = JSON.stringify(game)
  tick(game, 1000)
  assert.equal(JSON.stringify(game), point)
  game.paused = false
  tick(game, 100)
  assert.equal(game.phase, 'serve')
})

// Advance the ball alone so AI paddle contact cannot replace the shot under test.
function checkBounceTrajectory(game, horizontalDirection) {
  const ball = game.ball
  const dx = ball.targetX - ball.startX
  const dy = ball.targetY - ball.startY
  updateBall(game, ball.duration / 2)
  assert.equal(ball.bounced, false)
  assert.ok(Math.abs(ball.height - 36) < 0.000001)
  updateBall(game, ball.duration / 2)
  assert.equal(ball.bounced, true)
  assert.equal(game.phase, 'rally')
  const landingX = ball.x
  const landingY = ball.y
  for (let step = 1; step <= 4; step++) {
    updateBall(game, 0.1)
    const travelledX = ball.x - landingX
    const travelledY = ball.y - landingY
    // Collinearity verifies the same slope, not just that x moved at all.
    assert.ok(Math.abs(travelledX * dy - travelledY * dx) < 0.000001)
    assert.equal(Math.sign(travelledX), horizontalDirection)
    assert.ok(Math.abs(travelledY - Math.sign(dy) * 65 * step * 0.1) < 0.000001)
    assert.ok(Math.abs(ball.height - Math.sin(ball.afterBounce / 0.9 * Math.PI) * 15) < 0.000001)
    assert.deepEqual(game.scores, { player: 0, ai: 0 })
  }
  // The same return deadline still ends this rally once, even after a diagonal bounce.
  for (let step = 0; step < 6; step++) updateBall(game, 0.1)
  assert.equal(game.phase, 'point')
  assert.equal(game.scores[ball.lastHit], 1)
  updateBall(game, 1)
  assert.equal(game.scores[ball.lastHit], 1)
}

test('player diagonal shots keep their left/right trajectory after bouncing', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const direction of [-1, 1]) {
      const game = createGame(difficulty)
      stepGame(game, { ...idle, x: direction, swing: true }, 1 / 60, () => 0.5)
      assert.equal(game.ball.lastHit, 'player')
      checkBounceTrajectory(game, direction)
    }
  }
})

test('AI diagonal shots keep their left/right trajectory after bouncing', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const randomValue of [0.2, 0.8]) {
      const game = createGame(difficulty)
      game.server = 'ai'
      game.aiTimer = 0
      stepGame(game, idle, 1 / 60, () => randomValue)
      assert.equal(game.ball.lastHit, 'ai')
      checkBounceTrajectory(game, randomValue < 0.5 ? -1 : 1)
    }
  }
})

test('straight player and AI shots stay straight after bouncing', () => {
  for (const side of ['player', 'ai']) {
    const game = createGame('medium')
    game.server = side
    game.aiTimer = 0
    // The server starts at x=320 with the ball at x=340; this targets x=340 too.
    stepGame(game, { ...idle, swing: side === 'player' }, 1 / 60, () => 17 / 30)
    assert.equal(game.ball.lastHit, side)
    checkBounceTrajectory(game, 0)
  }
})
