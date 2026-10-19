import { createApi } from './client.js'

const TOKEN_KEY = 'pickleball.session.token'

// sessionStorage survives reloads in this tab, but does not persist like localStorage.
// Passwords and profile data are never stored here. JS storage still requires XSS protection.
export function readToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function storeToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch { /* The in-memory session still works when browser storage is disabled. */ }
}

export function createSessionConnection(initialToken, baseUrl, onExpired) {
  let token = initialToken
  let api
  try {
    api = createApi({ baseUrl, getToken: () => token, onUnauthorized: () => {
      token = null; storeToken(null); onExpired()
    } })
  } catch (error) {
    return { error: error.message, api: null }
  }
  return {
    setToken(value) { token = value; storeToken(value) },
    api,
  }
}
