// Serve power bar. Only shows during the player's serve.
export function drawCue(ctx, game) {
  const cue = game.cue
  if (!cue || game.phase !== 'serve' || game.server !== 'player' || game.paused) return

  ctx.save()

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
  const tip = 'HOLD SPACE: CHARGE · RELEASE: SERVE'
  const tw = ctx.measureText(tip).width
  const tx = (ctx.canvas.width - tw) / 2
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(tx - 6, 8, tw + 12, 20)
  ctx.fillStyle = '#fff'
  ctx.fillText(tip, tx, 22)

  ctx.restore()
}