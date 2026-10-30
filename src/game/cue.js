// Billiards-style serve cue. Only draws during the serve phase.
export function drawCue(ctx, game) {
  const cue = game.cue
  const ball = game.ball // if your ball has a different name, change it here
  if (!cue || !ball || game.phase !== 'serve' || game.paused) return

  const angle = Math.atan2(cue.y - ball.y, cue.x - ball.x)
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const pull = 14 + cue.power * 50

  ctx.save()

  // dotted aim line
  ctx.setLineDash([6, 6])
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(ball.x + dx * 10, ball.y + dy * 10)
  ctx.lineTo(ball.x + dx * 160, ball.y + dy * 160)
  ctx.stroke()
  ctx.setLineDash([])

  // cue stick, behind the ball, pulls back as power grows
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#d9a35b'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(ball.x - dx * pull, ball.y - dy * pull)
  ctx.lineTo(ball.x - dx * (pull + 110), ball.y - dy * (pull + 110))
  ctx.stroke()
  ctx.strokeStyle = '#f4f1e8'
  ctx.beginPath()
  ctx.moveTo(ball.x - dx * pull, ball.y - dy * pull)
  ctx.lineTo(ball.x - dx * (pull + 8), ball.y - dy * (pull + 8))
  ctx.stroke()

  // power bar (bottom left)
  const x = 16, y = ctx.canvas.height - 28, w = 120, h = 12
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4)
  ctx.fillStyle = cue.power > 0.8 ? '#e5484d' : cue.power > 0.5 ? '#f5a623' : '#4cc38a'
  ctx.fillRect(x, y, w * cue.power, h)
  ctx.fillStyle = '#fff'
  ctx.font = '10px monospace'
  ctx.fillText('POWER', x, y - 6)

  // on-canvas instructions
  const tip = 'AIM: MOUSE · HOLD: CHARGE · RELEASE: SERVE'
  const tw = ctx.measureText(tip).width
  const tx = (ctx.canvas.width - tw) / 2
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(tx - 6, 8, tw + 12, 20)
  ctx.fillStyle = '#fff'
  ctx.fillText(tip, tx, 22)

  ctx.restore()
}