import { COURT, WIDTH, HEIGHT } from './config.js'

function character(ctx, person, color, label, direction) {
  const x = Math.round(person.x)
  const y = Math.round(person.y)
  const stride = Math.round(Math.sin(person.walk) * 3)
  ctx.fillStyle = '#183d38'
  ctx.fillRect(x - 13, y + 6, 28, 7)
  ctx.fillStyle = '#172e35'
  ctx.fillRect(x - 9, y - 3 + stride, 7, 12)
  ctx.fillRect(x + 3, y - 3 - stride, 7, 12)
  ctx.fillStyle = color
  ctx.fillRect(x - 11, y - 21, 23, 20)
  ctx.fillStyle = '#f3c39b'
  ctx.fillRect(x - 8, y - 36, 16, 15)
  ctx.fillRect(x - 16, y - 19, 5, 14)
  ctx.fillRect(x + 12, y - 19, 7, 8)
  ctx.fillStyle = '#22313e'
  ctx.fillRect(x - 9, y - 38, 18, 5)
  const paddleY = y + (person.swing > 0 ? direction * 26 : -10)
  ctx.fillStyle = '#d9b47b'
  ctx.fillRect(x + 17, paddleY, 5, 15)
  ctx.fillStyle = '#fff2c7'
  ctx.fillRect(x + 12, paddleY - 12, 16, 17)
  ctx.fillStyle = '#456479'
  ctx.fillRect(x + 15, paddleY - 9, 10, 11)
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff4ce'
  ctx.fillText(label, x, y + 25)
}

export function drawGame(ctx, game) {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#234b43'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.fillStyle = '#347c79'
  ctx.fillRect(100, 60, 440, 440)
  ctx.fillStyle = '#58958a'
  ctx.fillRect(100, COURT.kitchenTop, 440, COURT.kitchenBottom - COURT.kitchenTop)
  ctx.strokeStyle = '#f7efd0'
  ctx.lineWidth = 3
  ctx.strokeRect(100, 60, 440, 440)
  ctx.beginPath()
  for (const y of [COURT.kitchenTop, COURT.kitchenBottom]) { ctx.moveTo(100, y); ctx.lineTo(540, y) }
  ctx.moveTo(320, 60); ctx.lineTo(320, COURT.kitchenTop)
  ctx.moveTo(320, COURT.kitchenBottom); ctx.lineTo(320, 500)
  ctx.stroke()
  ctx.font = '11px monospace'
  ctx.fillStyle = '#c4e0cb'
  ctx.textAlign = 'left'
  ctx.fillText('KITCHEN', 112, 235)
  ctx.fillText('KITCHEN', 112, 336)
  ctx.fillStyle = '#152f35'
  ctx.fillRect(88, COURT.net - 5, 464, 12)
  ctx.fillStyle = '#e4e7cc'
  for (let x = 92; x < 550; x += 10) ctx.fillRect(x, COURT.net - 2, 5, 5)
  ctx.fillRect(87, 268, 6, 26); ctx.fillRect(548, 268, 6, 26)
  character(ctx, game.ai, '#e38d67', 'AI', 1)
  character(ctx, game.player, '#7ac2ed', 'YOU', -1)
  const ball = game.ball
  ctx.fillStyle = '#183d38'
  ctx.fillRect(Math.round(ball.x) - 6, Math.round(ball.y) - 2, 13, 5)
  ctx.strokeStyle = '#ffe879'
  if (ball.bounced && game.phase === 'rally') ctx.strokeRect(ball.x - 10, ball.y - 7, 20, 14)
  ctx.fillStyle = '#152f35'
  ctx.fillRect(Math.round(ball.x) - 6, Math.round(ball.y - ball.height) - 8, 12, 12)
  ctx.fillStyle = '#ffe85b'
  ctx.fillRect(Math.round(ball.x) - 4, Math.round(ball.y - ball.height) - 6, 8, 8)
  ctx.fillStyle = '#a08f31'
  ctx.fillRect(Math.round(ball.x), Math.round(ball.y - ball.height) - 4, 2, 2)
}
