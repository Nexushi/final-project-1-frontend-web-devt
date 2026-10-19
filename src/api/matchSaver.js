import { ApiError } from './client.js'

const sameProgress = (match, progress) => match.playerScore === progress.playerScore &&
  match.aiScore === progress.aiScore && match.status === progress.status

export function createMatchSaver(api, initialMatch) {
  let saved = initialMatch
  let inFlight = null
  let uncertain = false
  let conflict = false

  async function persist(progress) {
    if (conflict) throw new ApiError('This match changed elsewhere. Load the server match before continuing.', 409)
    // A lost PATCH response may have committed. Read first instead of blindly sending twice.
    if (uncertain) {
      const { match } = await api.match(saved.id)
      if (sameProgress(match, progress)) { saved = match; uncertain = false; return saved }
      if (match.version !== saved.version || match.status === 'COMPLETED') {
        conflict = true
        throw new ApiError('This match changed elsewhere. Load the server match before continuing.', 409)
      }
      saved = match
      uncertain = false
    }
    if (sameProgress(saved, progress)) return saved
    try {
      const { match } = await api.saveMatch(saved.id, { ...progress, version: saved.version })
      saved = match
      return saved
    } catch (error) {
      if (error.status === 409) conflict = true
      else if (!error.status || error.status >= 500) uncertain = true
      throw error
    }
  }

  return {
    getRecord: () => saved,
    save(summary) {
      // Only these fields are permitted by the backend. No ball state or role fields.
      const progress = { playerScore: summary.playerScore, aiScore: summary.aiScore, status: summary.status }
      const key = JSON.stringify(progress)
      if (inFlight) {
        if (inFlight.key === key) return inFlight.promise
        return Promise.reject(new Error('Wait for the current point to finish saving.'))
      }
      const promise = persist(progress).finally(() => { inFlight = null })
      inFlight = { key, promise }
      return promise
    },
  }
}
