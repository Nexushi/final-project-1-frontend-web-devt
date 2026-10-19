import { ApiError } from './client.js'

// Only use the user returned by authenticated backend responses, not JWT role claims.
export function isAdmin(user) {
  return user?.role === 'ADMIN'
}

export async function loadAdminData(api, user) {
  if (!isAdmin(user)) throw new ApiError('Admin access required.', 403)
  // Check the current database role before loading any administrative data.
  const { user: currentUser } = await api.profile()
  if (!isAdmin(currentUser)) throw new ApiError('Admin access is no longer available. Sign in again to recheck your role.', 403)
  const [players, records, settings] = await Promise.all([
    api.adminUsers(), api.adminMatches(), api.adminDifficulties(),
  ])
  return { users: players.users, matches: records.matches, difficulties: settings.difficulties }
}

export function difficultyPayload(form) {
  const levelName = form.levelName.trim()
  if (!/^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,31}$/.test(levelName)) {
    throw new Error('Use a 1–32 character name starting with a letter or number. Letters, numbers, spaces, underscores and hyphens are allowed.')
  }
  const aiSpeed = Number(form.aiSpeed)
  const ballSpeed = Number(form.ballSpeed)
  if (![aiSpeed, ballSpeed].every(speed => Number.isFinite(speed) && speed >= 1 && speed <= 2000)) {
    throw new Error('Speeds must be numbers from 1 to 2000 pixels per second.')
  }
  return { levelName, aiSpeed, ballSpeed, isActive: form.isActive === true }
}

export function difficultyIsUsed(data, id) {
  return data.matches.some(match => match.difficultyId === id) ||
    data.users.some(user => user.preferredDifficultyId === id)
}
