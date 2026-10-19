import { WINNING_SCORE } from './config.js'

export function awardPoint(game, winner, reason) {
  // Lock this rally before another collision can award a duplicate point.
  if (game.phase !== 'rally') return
  game.scores[winner] += 1
  game.server = winner
  game.message = `${winner === 'player' ? 'Player' : 'AI'} point! ${reason}`
  game.phase = game.scores[winner] >= WINNING_SCORE ? 'over' : 'point'
  game.winner = game.phase === 'over' ? winner : null
  game.status = game.phase === 'over' ? 'COMPLETED' : 'IN_PROGRESS'
  game.pointTimer = 1.5
}
