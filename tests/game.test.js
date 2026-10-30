import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGame, resetServe, stepGame, updateBall, canReturn, getMatchSummary } from '../src/game/engine.js'
import { awardPoint } from '../src/game/scoring.js'
import { COURT, DIFFICULTIES, SHOTS } from '../src/game/config.js'

const idle = { x: 0, y: 0, swing: false }
const tick = (game, count, input = idle, random = () => 0.5) => {
  for (let i = 0; i < count; i++) stepGame(game, input, 1 / 60, random)
}

test('movement is normalized, bounded, and paused input changes nothing', () => {
  const a = createGame('easy'), b = createGame('easy')
  // Movement now starts after serving; the server is held in its service court.
  for (const game of [a, b]) {
    game.phase = 'rally'
    Object.assign(game.player, { x: 320, y: 440 })
  }
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
  // A rally shot can go out; serves now always use a safe diagonal target.
  const game = rallyReturn('player', 'easy', 1, () => 0.5, 520)
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

function rallyReturn(side, difficulty, aim = 0, random = () => 0.5, x = 320, aimY = 0) {
  const game = createGame(difficulty)
  game.phase = 'rally'
  Object.assign(game[side], { x, y: side === 'player' ? 440 : 120 })
  // A legal incoming bounced ball lets us test ordinary returns, not serves.
  game.ball = { active: true, lastHit: side === 'player' ? 'ai' : 'player', receiver: side,
    startX: x, startY: side === 'player' ? 140 : 420,
    targetX: x, targetY: side === 'player' ? 420 : 140,
    x, y: side === 'player' ? 420 : 140, height: 0, bounced: true, afterBounce: 0.4 }
  game.aiTimer = 0; game.aiMiss = false; game.aiTarget = x
  stepGame(game, side === 'player' ? { x: aim, y: aimY, swing: true } : idle, 1 / 60, random)
  assert.equal(game.ball.isServe, false)
  return game
}

test('player diagonal shots keep their left/right trajectory after bouncing', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const direction of [-1, 1]) {
      const game = rallyReturn('player', difficulty, direction)
      assert.equal(game.ball.lastHit, 'player')
      checkBounceTrajectory(game, direction)
    }
  }
})

test('AI diagonal shots keep their left/right trajectory after bouncing', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const randomValue of [0.2, 0.8]) {
      const game = rallyReturn('ai', difficulty, 0, () => randomValue)
      assert.equal(game.ball.lastHit, 'ai')
      checkBounceTrajectory(game, randomValue < 0.5 ? -1 : 1)
    }
  }
})

test('straight player and AI shots stay straight after bouncing', () => {
  for (const side of ['player', 'ai']) {
    // A centered ordinary return can be straight; initial serves must be diagonal.
    const game = rallyReturn(side, 'medium')
    assert.equal(game.ball.lastHit, side)
    checkBounceTrajectory(game, 0)
  }
})

test('service positions use the server own score and facing direction on every point', () => {
  for (const side of ['player', 'ai']) {
    for (let score = 0; score < 5; score++) {
      const game = createGame('medium')
      game.server = side
      game.scores[side] = score
      game.scores[side === 'player' ? 'ai' : 'player'] = (score + 1) % 5
      resetServe(game)
      const screenRight = side === 'player' ? score % 2 === 0 : score % 2 === 1
      assert.equal(game[side].x > 320, screenRight)
      assert.equal(game[side === 'player' ? 'ai' : 'player'].x > 320, !screenRight)
      assert.equal(game[side].y, side === 'player' ? COURT.bottom - 16 : COURT.top + 20)
      assert.match(game.message, score % 2 === 0 ? /RIGHT court/ : /LEFT court/)
      if (side === 'player') {
        const position = { x: game.player.x, y: game.player.y }
        tick(game, 10, { x: -1, y: -1, swing: false })
        assert.deepEqual({ x: game.player.x, y: game.player.y }, position)
      }
    }
  }
})

test('serves from both sides always cross the net into the diagonal box beyond the kitchen', () => {
  for (const side of ['player', 'ai']) {
    for (let score = 0; score < 5; score++) {
      for (const randomValue of [0, 1]) {
        const game = createGame('easy')
        game.server = side; game.scores[side] = score
        resetServe(game); game.aiTimer = 0
        stepGame(game, { x: randomValue === 0 ? -1 : 1, y: -1, swing: true }, 1 / 60, () => randomValue)
        const ball = game.ball
        assert.equal(ball.isServe, true)
        assert.equal(ball.lastHit, side)
        assert.notEqual(ball.startX > 320, ball.targetX > 320)
        assert.ok(ball.targetX > COURT.left && ball.targetX < COURT.right && ball.targetX !== 320)
        assert.ok(side === 'player' ? ball.targetY > COURT.top && ball.targetY < COURT.kitchenTop :
          ball.targetY > COURT.kitchenBottom && ball.targetY < COURT.bottom)
        const netProgress = (COURT.net - ball.startY) / (ball.targetY - ball.startY)
        updateBall(game, ball.duration * netProgress)
        assert.ok(Math.abs(ball.y - COURT.net) < 0.000001)
        assert.ok(ball.height > 0)
        updateBall(game, ball.duration)
        assert.equal(ball.bounced, true)
        assert.equal(game.phase, 'rally')
        assert.equal(canReturn(game, 'ai'), false)
        assert.deepEqual(game.scores, { player: side === 'player' ? score : 0, ai: side === 'ai' ? score : 0 })
      }
    }
  }
})

test('AI waits after the first bounce but can move and return reachable shots on every difficulty', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const game = createGame(difficulty)
    stepGame(game, { ...idle, swing: true }, 1 / 60, () => 0.5)
    Object.assign(game.ai, { x: game.ball.targetX + 35, y: game.ball.targetY + 15 })
    game.aiTimer = -10 // The earlier in-flight reaction timer has already expired.
    game.aiTarget = game.ball.targetX
    assert.equal(canReturn(game, 'ai'), false)
    updateBall(game, game.ball.duration)
    assert.equal(game.ball.afterBounce, 0)
    assert.equal(canReturn(game, 'ai'), false)
    const oldX = game.ai.x
    let elapsed = 0
    while (elapsed + 1 / 60 < game.settings.postBounceDelay) {
      tick(game, 1)
      elapsed += 1 / 60
      assert.equal(game.ball.lastHit, 'player')
      assert.equal(canReturn(game, 'ai'), false)
    }
    assert.notEqual(game.ai.x, oldX)
    tick(game, 1)
    assert.equal(game.ball.lastHit, 'ai')
    assert.equal(game.ball.bounced, false)
    assert.equal(game.ball.isServe, false)
  }
})

test('post-bounce delay does not restrict human returns or restore an unsaved service turn', () => {
  for (let playerScore = 0; playerScore < 5; playerScore++) {
    const game = createGame('hard', DIFFICULTIES.hard, { playerScore, aiScore: 4 })
    assert.equal(game.server, 'player')
    assert.equal(game.player.x > 320, playerScore % 2 === 0)
    assert.deepEqual(game.scores, { player: playerScore, ai: 4 })
    game.phase = 'rally'
    Object.assign(game.ball, { receiver: 'player', bounced: true, afterBounce: 0, x: game.player.x, y: game.player.y })
    assert.equal(canReturn(game, 'player'), true)
  }
})

test('the rally winner serves next using their own updated score', () => {
  for (const winner of ['player', 'ai']) {
    const game = createGame('medium')
    game.phase = 'rally'
    awardPoint(game, winner, 'missed return')
    tick(game, 100)
    assert.equal(game.server, winner)
    assert.equal(game.scores[winner], 1)
    assert.match(game.message, /LEFT court/)
    assert.equal(game[winner].x > 320, winner === 'ai')
  }
})

test('vertical input picks drive, dink, or lob for player rally shots', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const randomValue of [0, 0.5, 1]) {
      for (const [aimY, name] of [[0, 'drive'], [-1, 'dink'], [1, 'lob']]) {
        const game = rallyReturn('player', difficulty, 0, () => randomValue, 320, aimY)
        const shot = SHOTS[name]
        assert.equal(game.ball.shot, name)
        assert.equal(game.ball.arc, shot.arc)
        assert.ok(game.ball.targetY >= shot.y[0] && game.ball.targetY <= shot.y[1])
        assert.ok(game.ball.duration >= 0.55 && Number.isFinite(game.ball.duration))
        // The drawn arc peaks at this shot's own height, halfway through the flight.
        updateBall(game, game.ball.duration / 2)
        assert.equal(game.ball.bounced, false)
        assert.ok(Math.abs(game.ball.height - shot.arc) < 0.000001)
      }
    }
  }
})

test('dinks land in the AI kitchen, lobs land deeper than drives, and every shot stays in bounds', () => {
  for (const randomValue of [0, 1]) {
    const dink = rallyReturn('player', 'medium', 0, () => randomValue, 320, -1)
    assert.ok(dink.ball.targetY > COURT.kitchenTop && dink.ball.targetY < COURT.net)
    const lob = rallyReturn('player', 'medium', 0, () => randomValue, 320, 1)
    assert.ok(lob.ball.targetY < SHOTS.drive.y[0] && lob.ball.targetY > COURT.top)
    assert.ok(lob.ball.arc > SHOTS.drive.arc && dink.ball.arc < SHOTS.drive.arc)
  }
})

test('a lob always leaves the AI a return window longer than its post-bounce delay', () => {
  // After bouncing, the ball moves toward the baseline at 65 px/s and is a fault once it crosses it.
  const window = (SHOTS.lob.y[0] - COURT.top) / 65
  for (const settings of Object.values(DIFFICULTIES)) assert.ok(window > settings.postBounceDelay + 0.2)
})

test('serves ignore vertical input and AI shots are always drives', () => {
  for (const y of [-1, 1]) {
    const game = createGame('medium')
    stepGame(game, { x: 0, y, swing: true }, 1 / 60, () => 0.5)
    assert.equal(game.ball.isServe, true)
    assert.equal(game.ball.shot, 'drive')
    assert.equal(game.ball.arc, SHOTS.drive.arc)
    assert.ok(game.ball.targetY > COURT.top && game.ball.targetY < COURT.kitchenTop)
  }
  assert.equal(rallyReturn('ai', 'medium').ball.shot, 'drive')
})

test('matches played with mixed dinks and lobs finish with valid state on every difficulty', () => {
  let seed = 4242
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const verticals = [-1, 1, 0]
  let swings = 0
  for (let match = 0; match < 30; match++) {
    const game = createGame(Object.keys(DIFFICULTIES)[match % 3])
    for (let frame = 0; frame < 36000 && game.phase !== 'over'; frame++) {
      const prev = game.scores.player + game.scores.ai
      const dx = game.ball.x - game.player.x
      const dy = game.ball.y + 15 - game.player.y
      const swing = game.phase === 'serve' || (canReturn(game, 'player') && frame % 12 === 0)
      // Cycle shot types on swing frames; otherwise use vertical input to chase the ball.
      const y = swing && game.phase === 'rally' ? verticals[swings++ % 3] : (Math.abs(dy) > 5 ? Math.sign(dy) : 0)
      stepGame(game, { x: Math.abs(dx) > 5 ? Math.sign(dx) : 0, y, swing }, 1 / 60, random)
      assert.ok(game.scores.player + game.scores.ai - prev <= 1)
      assert.ok(Number.isFinite(game.ball.x) && Number.isFinite(game.ball.y) && Number.isFinite(game.ball.height))
    }
    assert.equal(game.phase, 'over')
  }
  assert.ok(swings > 0)
})
