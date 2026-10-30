import { COURT, DIFFICULTIES, PADDLE_RANGE, PLAYER_SPEED, SHOTS } from './config.js'
import { awardPoint } from './scoring.js'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const otherSide = side => side === 'player' ? 'ai' : 'player'

export function getServiceCourt(score) {
  return score % 2 === 0 ? 'RIGHT' : 'LEFT'
}

function servingX(side, score) {
  // The top AI faces down, so its right is the screen's left.
  const screenRight = (side === 'player') === (getServiceCourt(score) === 'RIGHT')
  return COURT.left + (COURT.right - COURT.left) * (screenRight ? 0.75 : 0.25)
}

export function createGame(difficulty, settings = DIFFICULTIES[difficulty], savedMatch = null) {
  const game = {
    difficulty, settings, status: 'IN_PROGRESS', phase: 'serve', paused: false, saving: false,
    scores: { player: savedMatch?.playerScore ?? 0, ai: savedMatch?.aiScore ?? 0 }, server: 'player', winner: null,
    player: { x: 320, y: 440, walk: 0, swing: 0 },
    ai: { x: 320, y: 120, walk: 0, swing: 0 },
    ball: {}, message: '', pointTimer: 0, aiTimer: 0, aiTarget: 320, aiMiss: false,
  }
  resetServe(game)
  return game
}

export function resetServe(game) {
  game.phase = 'serve'
  const serverX = servingX(game.server, game.scores[game.server])
  const receiverX = COURT.left + COURT.right - serverX
  Object.assign(game.player, { x: game.server === 'player' ? serverX : receiverX,
    y: COURT.bottom - (game.server === 'player' ? 16 : 60), swing: 0 })
  Object.assign(game.ai, { x: game.server === 'ai' ? serverX : receiverX,
    y: COURT.top + (game.server === 'ai' ? 20 : 60), swing: 0 })
  const server = game[game.server]
  game.ball = { x: server.x + 20, y: server.y + (game.server === 'player' ? -20 : 20), height: 0, active: false }
  game.aiTimer = 1
  const court = getServiceCourt(game.scores[game.server])
  game.message = game.server === 'player'
    ? `Your serve — ${court} court · Hold Space to charge, release to serve`
    : `AI serves — ${court} court`
}

export function moveCharacter(character, dx, dy, speed, dt, side) {
  const length = Math.hypot(dx, dy)
  if (length) {
    character.x += dx / length * speed * dt
    character.y += dy / length * speed * dt
    character.walk += dt * 12
  }
  character.x = clamp(character.x, COURT.left + 16, COURT.right - 16)
  character.y = clamp(character.y, side === 'player' ? COURT.net + 24 : COURT.top + 20, side === 'player' ? COURT.bottom - 16 : COURT.net - 24)
}

<<<<<<< HEAD
<<<<<<< HEAD
// servePower: 0.1 to 1 from a charged serve. Missing (AI serve, plain Space) means normal speed.
function shoot(game, side, aim, random, servePower = null) {
=======
=======
>>>>>>> origin/main
function aiPlacement(game, random) {
  const smartness = game.settings.smartness ?? 0.4
  if (random() < smartness) {
    const farSide = game.player.x < 320 ? 440 : 200
    return farSide + (random() * 60 - 30)
  }
  return 170 + random() * 300
}

// Up (negative y) dinks, down (positive y) lobs, no vertical key drives.
export function shotFromInput(y) {
  return y < 0 ? 'dink' : y > 0 ? 'lob' : 'drive'
}

function shoot(game, side, aim, random, shotType = 'drive') {
<<<<<<< HEAD
>>>>>>> origin
=======
>>>>>>> origin/main
  const ball = game.ball
  const settings = game.settings
  const hitter = game[side]
  const isServe = game.phase === 'serve'
  // Serves and AI shots are always drives; only ordinary player rally shots can change type.
  const shotName = isServe || side !== 'player' ? 'drive' : shotType
  const shot = SHOTS[shotName]
  // Ground position follows a straight line; drawing adds a small height arc.
  // A directed shot near a sideline can land out, so aim toward open court.
  // Serves aim safely into the diagonal service box, never the kitchen.
  // Directional keys and random placement still apply to ordinary rally shots.
  const targetX = isServe ? COURT.left + COURT.right - servingX(side, game.scores[side]) :
    side === 'ai' ? aiPlacement(game, random) :
    aim ? hitter.x + aim * 180 : 170 + random() * 300
  const targetY = isServe ? (side === 'player' ? (COURT.top + COURT.kitchenTop) / 2 : (COURT.kitchenBottom + COURT.bottom) / 2) :
<<<<<<< HEAD
<<<<<<< HEAD
    side === 'player' ? 125 + random() * 50 : 395 + random() * 50
  // Charged serves change speed only. The target stays inside the service box,
  // so a strong serve is faster but cannot land out.
  const power = Number.isFinite(servePower) ? clamp(servePower, 0, 1) : null
  const charged = isServe && power !== null
  const speedFactor = charged ? 0.6 + 0.9 * power : 1
  const duration = Math.hypot(targetX - ball.x, targetY - ball.y) / (settings.ballSpeed * speedFactor)
  Object.assign(ball, { active: true, isServe, lastHit: side, receiver: otherSide(side),
=======
    side === 'player' ? shot.y[0] + random() * (shot.y[1] - shot.y[0]) : 395 + random() * 50
  const duration = Math.hypot(targetX - ball.x, targetY - ball.y) / (settings.ballSpeed * shot.speed)
  Object.assign(ball, { active: true, isServe, shot: shotName, arc: shot.arc, lastHit: side, receiver: otherSide(side),
>>>>>>> origin
=======
    side === 'player' ? shot.y[0] + random() * (shot.y[1] - shot.y[0]) : 395 + random() * 50
  const duration = Math.hypot(targetX - ball.x, targetY - ball.y) / (settings.ballSpeed * shot.speed)
  Object.assign(ball, { active: true, isServe, shot: shotName, arc: shot.arc, lastHit: side, receiver: otherSide(side),
>>>>>>> origin/main
    startX: ball.x, startY: ball.y, targetX, targetY, elapsed: 0,
    duration: Math.max(charged ? 0.3 : 0.55, duration), bounced: false, afterBounce: 0, height: 0 })
  hitter.swing = 0.24
  game.phase = 'rally'
  game.aiTimer = settings.reaction
  game.aiTarget = clamp(targetX + (random() * 2 - 1) * settings.error, COURT.left + 16, COURT.right - 16)
  game.aiMiss = side === 'player' && random() < settings.miss
  game.message = shotName === 'dink' ? 'Dink! A soft shot into the kitchen.' :
    shotName === 'lob' ? 'Lob! High and deep.' : 'Rally! Move to the shadow and return after the bounce.'
}

export function canReturn(game, side) {
  const ball = game.ball
  return game.phase === 'rally' && ball.receiver === side && ball.bounced &&
    // This clock starts at the bounce, independently of the in-flight reaction timer.
    (side !== 'ai' || ball.afterBounce >= game.settings.postBounceDelay) &&
    Math.hypot(game[side].x - ball.x, game[side].y - ball.y) <= PADDLE_RANGE
}

function updateAI(game, dt, random) {
  const settings = game.settings
  game.aiTimer -= dt
  if (game.phase === 'serve') {
    if (game.server === 'ai' && game.aiTimer <= 0) shoot(game, 'ai', 0, random)
    return
  }
  if (game.ball.receiver !== 'ai' || game.aiTimer > 0) return
  const targetY = clamp(game.ball.targetY + 15, COURT.top + 20, COURT.net - 24)
  const dx = game.aiTarget - game.ai.x
  const dy = targetY - game.ai.y
  if (Math.hypot(dx, dy) > 5) moveCharacter(game.ai, dx, dy, Math.min(settings.speed, Math.hypot(dx, dy) / dt), dt, 'ai')
  if (!game.aiMiss && canReturn(game, 'ai')) shoot(game, 'ai', 0, random)
}

export function updateBall(game, dt) {
  const ball = game.ball
  if (!ball.active || game.phase !== 'rally') return
  if (!ball.bounced) {
    ball.elapsed += dt
    const progress = Math.min(1, ball.elapsed / ball.duration)
    ball.x = ball.startX + (ball.targetX - ball.startX) * progress
    ball.y = ball.startY + (ball.targetY - ball.startY) * progress
    ball.height = Math.sin(progress * Math.PI) * (ball.arc ?? SHOTS.drive.arc)
    if (progress === 1) {
      if (ball.x < COURT.left || ball.x > COURT.right || ball.y < COURT.top || ball.y > COURT.bottom) {
        awardPoint(game, ball.receiver, 'Ball landed out.')
        return
      }
      ball.bounced = true
      game.message = ball.receiver === 'player' ? 'Bounce! Space to return.' : 'AI is returning…'
    }
  } else {
    ball.afterBounce += dt
    // Keep the incoming ground-plane slope. The forward speed stays 65 px/s
    // so the existing return window and baseline timing do not change.
    const forwardDistance = Math.abs(ball.targetY - ball.startY)
    const sidewaysSpeed = forwardDistance > 0 ? (ball.targetX - ball.startX) / forwardDistance * 65 : 0
    ball.x += sidewaysSpeed * dt
    ball.y += (ball.receiver === 'player' ? 1 : -1) * 65 * dt
    ball.height = Math.sin(Math.min(1, ball.afterBounce / 0.9) * Math.PI) * 15
    if (ball.afterBounce >= 0.9 || ball.y < COURT.top || ball.y > COURT.bottom) awardPoint(game, ball.lastHit, 'Return missed.')
  }
}

export function stepGame(game, input, dt, random = Math.random) {
  if (game.paused || game.saving || game.phase === 'over') return
  // A suspended tab must never skip a rally or produce a giant movement step.
  dt = Math.min(dt, 0.033)
  for (const side of ['player', 'ai']) game[side].swing = Math.max(0, game[side].swing - dt)
  if (game.phase === 'point') {
    game.pointTimer -= dt
    if (game.pointTimer <= 0) resetServe(game)
    return
  }
  // Hold the human server in the correct service court until Space starts play.
  if (game.phase !== 'serve' || game.server !== 'player') {
    moveCharacter(game.player, input.x, input.y, PLAYER_SPEED, dt, 'player')
  }
  if (game.phase === 'serve') {
    const server = game[game.server]
    Object.assign(game.ball, { x: server.x + 20, y: server.y + (game.server === 'player' ? -20 : 20) })
    if (game.server === 'player' && input.swing) shoot(game, 'player', input.x, random, input.servePower)
  } else {
    updateBall(game, dt)
    if (game.phase !== 'rally') return
    if (input.swing) {
      if (canReturn(game, 'player')) shoot(game, 'player', input.x, random, shotFromInput(input.y))
      else { game.player.swing = 0.24; game.message = 'Get close and swing after the bounce.' }
    }
  }
  updateAI(game, dt, random)
}

// Point-boundary API summary; ball positions deliberately stay local.
export function getMatchSummary(game) {
  return { difficulty: game.difficulty, playerScore: game.scores.player, aiScore: game.scores.ai,
    status: game.status, phase: game.phase, paused: game.paused, server: game.server, winner: game.winner }
}