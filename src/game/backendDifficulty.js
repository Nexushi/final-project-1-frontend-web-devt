import { DIFFICULTIES } from './config.js'

export function mapDifficulty(setting) {
  if (!setting || typeof setting.levelName !== 'string' ||
      !Number.isFinite(setting.aiSpeed) || setting.aiSpeed < 1 || setting.aiSpeed > 2000 ||
      !Number.isFinite(setting.ballSpeed) || setting.ballSpeed < 1 || setting.ballSpeed > 2000) {
    throw new Error('The backend returned invalid difficulty settings. Ask the team to check the API.')
  }
  const name = setting.levelName.trim().toLowerCase()
  // Named levels retain their familiar reaction/miss presets. Custom names use Medium.
  const level = Object.hasOwn(DIFFICULTIES, name) ? name : 'medium'
  return { ...DIFFICULTIES[level], level, label: setting.levelName,
    speed: setting.aiSpeed, ballSpeed: setting.ballSpeed }
}
