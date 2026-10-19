export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function createApi({ baseUrl = 'http://localhost:5000', getToken = () => null,
  onUnauthorized = () => {}, fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const base = new URL(baseUrl)
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password ||
      base.search || base.hash || !['', '/'].includes(base.pathname)) {
    throw new Error('VITE_API_BASE_URL must be an HTTP(S) backend origin, without credentials or a path.')
  }
  async function request(path, { method = 'GET', body, auth = true } = {}) {
    // Paths are internal constants; neither caller input nor response URLs can redirect tokens.
    if (!path.startsWith('/api/') || path.includes('..') || path.includes('\\') || path.includes('?') || path.includes('#')) {
      throw new Error('Invalid API path')
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const headers = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = auth ? getToken() : null
    if (token) headers.Authorization = `Bearer ${token}`
    try {
      const response = await fetchImpl(`${base.origin}${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store',
      })
      const data = response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status === 401 && auth && getToken() === token) onUnauthorized()
        throw new ApiError(data?.message || `API request failed (${response.status}).`, response.status)
      }
      if (response.status !== 204 && (!data || typeof data !== 'object')) {
        throw new ApiError('The backend returned an invalid response.', response.status)
      }
      return data
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError('Cannot reach the backend. Check the API URL, server, CORS, and network. No save was confirmed.')
    } finally { clearTimeout(timer) }
  }
  const matchPath = id => `/api/matches/${encodeURIComponent(id)}`
  return {
    login: credentials => request('/api/auth/login', { method: 'POST', body: credentials, auth: false }),
    register: credentials => request('/api/auth/register', { method: 'POST', body: credentials, auth: false }),
    profile: () => request('/api/users/profile'),
    updateProfile: changes => request('/api/users/profile', { method: 'PUT', body: changes }),
    difficulties: () => request('/api/difficulty', { auth: false }),
    createMatch: difficultyId => request('/api/matches', { method: 'POST', body: { difficultyId } }),
    matches: () => request('/api/matches'),
    match: id => request(matchPath(id)),
    saveMatch: (id, changes) => request(matchPath(id), { method: 'PATCH', body: changes }),
    deleteMatch: id => request(matchPath(id), { method: 'DELETE' }),
    adminUsers: () => request('/api/admin/users'),
    adminMatches: () => request('/api/admin/matches'),
    adminDifficulties: () => request('/api/admin/difficulty'),
    adminDeleteUser: id => request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    adminCreateDifficulty: changes => request('/api/admin/difficulty', { method: 'POST', body: changes }),
    adminUpdateDifficulty: (id, changes) => request(`/api/admin/difficulty/${encodeURIComponent(id)}`, { method: 'PUT', body: changes }),
    adminDeleteDifficulty: id => request(`/api/admin/difficulty/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  }
}
