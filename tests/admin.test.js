import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AdminNavigation from '../src/components/AdminNavigation.js'
import { difficultyIsUsed, difficultyPayload, isAdmin, loadAdminData } from '../src/api/admin.js'
import { ApiError, createApi } from '../src/api/client.js'

const admin = { id: 'admin-id', username: 'approved_admin', role: 'ADMIN' }
const player = { id: 'player-id', username: 'player', role: 'PLAYER' }
const setting = { id: 'level-id', levelName: 'Easy', aiSpeed: 140, ballSpeed: 240, isActive: true }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function mockAdminApi(profile = admin) {
  const calls = []
  return { calls,
    profile: async () => { calls.push('profile'); return { user: profile } },
    adminUsers: async () => { calls.push('users'); return { users: [player] } },
    adminMatches: async () => { calls.push('matches'); return { matches: [] } },
    adminDifficulties: async () => { calls.push('difficulties'); return { difficulties: [setting] } },
  }
}

test('Admin navigation renders only for the exact authenticated ADMIN role', () => {
  const markup = renderToStaticMarkup(createElement(AdminNavigation, { user: admin, onOpen: () => {} }))
  assert.match(markup, /<button[^>]*>Admin Dashboard<\/button>/)
  for (const user of [null, undefined, player, {}, { role: 'admin' }, { role: 'PLAYER', isAdmin: true }, { token: { role: 'ADMIN' } }]) {
    assert.equal(isAdmin(user), false)
    assert.equal(renderToStaticMarkup(createElement(AdminNavigation, { user, onOpen: () => {} })), '')
  }
})

test('regular players and signed-out users cannot initiate Admin loading', async () => {
  for (const user of [player, null]) {
    const api = mockAdminApi()
    await assert.rejects(loadAdminData(api, user), { status: 403 })
    assert.deepEqual(api.calls, [])
  }
})

test('Admin entry rechecks the current authenticated database role before loading lists', async () => {
  const api = mockAdminApi()
  const data = await loadAdminData(api, admin)
  assert.deepEqual(api.calls, ['profile', 'users', 'matches', 'difficulties'])
  assert.deepEqual(data, { users: [player], matches: [], difficulties: [setting] })
  const demoted = mockAdminApi(player)
  await assert.rejects(loadAdminData(demoted, admin), { status: 403 })
  assert.deepEqual(demoted.calls, ['profile'])
})

test('Admin list failures reject the whole load instead of displaying partial data', async () => {
  for (const status of [401, 403, 500]) {
    const api = mockAdminApi()
    api.adminMatches = async () => { throw new ApiError('Request denied', status) }
    await assert.rejects(loadAdminData(api, admin), { status })
  }
})

test('Admin methods use exact protected endpoints; destructive requests use mocks only', async () => {
  const requests = []
  const api = createApi({ baseUrl: 'https://backend.test', getToken: () => 'mock-session', fetchImpl: async (url, options) => {
    requests.push({ url, ...options })
    if (options.method === 'DELETE') return new Response(null, { status: 204 })
    if (options.method === 'POST' || options.method === 'PUT') return json({ difficulty: setting })
    if (url.endsWith('/users')) return json({ users: [player] })
    if (url.endsWith('/matches')) return json({ matches: [] })
    return json({ difficulties: [setting] })
  } })
  assert.deepEqual(await api.adminUsers(), { users: [player] })
  await api.adminMatches(); await api.adminDifficulties()
  await api.adminCreateDifficulty({ levelName: 'Easy', aiSpeed: 140, ballSpeed: 240, isActive: true })
  await api.adminUpdateDifficulty('level-id', { isActive: false })
  assert.equal(await api.adminDeleteDifficulty('unused-id'), null)
  assert.equal(await api.adminDeleteUser('player-id'), null)
  assert.deepEqual(requests.map(request => [request.method, new URL(request.url).pathname]), [
    ['GET', '/api/admin/users'], ['GET', '/api/admin/matches'], ['GET', '/api/admin/difficulty'],
    ['POST', '/api/admin/difficulty'], ['PUT', '/api/admin/difficulty/level-id'],
    ['DELETE', '/api/admin/difficulty/unused-id'], ['DELETE', '/api/admin/users/player-id'],
  ])
  for (const request of requests) {
    assert.equal(request.headers.Authorization, 'Bearer mock-session')
    assert.equal(new URL(request.url).origin, 'https://backend.test')
    assert.equal(request.redirect, 'error')
  }
  assert.deepEqual(JSON.parse(requests[3].body), { levelName: 'Easy', aiSpeed: 140, ballSpeed: 240, isActive: true })
  assert.deepEqual(JSON.parse(requests[4].body), { isActive: false })
})

test('Admin 403 is an access error, not a logout or successful deletion', async () => {
  let expired = false
  const api = createApi({ getToken: () => 'mock-player', onUnauthorized: () => { expired = true },
    fetchImpl: async () => json({ message: 'Access denied' }, 403) })
  for (const action of [() => api.adminUsers(), () => api.adminDeleteUser('id'), () => api.adminCreateDifficulty({ levelName: 'Test' })]) {
    await assert.rejects(action(), { status: 403, message: 'Access denied' })
  }
  assert.equal(expired, false)
})

test('Admin 401 uses existing session-expiration handling', async () => {
  let expired = false
  const api = createApi({ getToken: () => 'expired', onUnauthorized: () => { expired = true },
    fetchImpl: async () => json({ message: 'Invalid or expired token' }, 401) })
  await assert.rejects(api.adminDifficulties(), { status: 401 })
  assert.equal(expired, true)
})

test('referenced difficulty 409, missing records and offline writes remain explicit failures', async () => {
  const conflict = createApi({ fetchImpl: async () => json({ message: 'Difficulty is still referenced; deactivate it instead' }, 409) })
  await assert.rejects(conflict.adminDeleteDifficulty('used'), { status: 409, message: 'Difficulty is still referenced; deactivate it instead' })
  const missing = createApi({ fetchImpl: async () => json({ message: 'Player not found' }, 404) })
  await assert.rejects(missing.adminDeleteUser('missing'), { status: 404 })
  const offline = createApi({ fetchImpl: async () => { throw new Error('network') } })
  await assert.rejects(offline.adminUpdateDifficulty('id', { isActive: false }), { status: 0 })
})

test('difficulty form validates backend constraints and sends only allowed typed fields', () => {
  assert.deepEqual(difficultyPayload({ levelName: ' Demo Practice ', aiSpeed: '150.5', ballSpeed: '280', isActive: true, role: 'ADMIN' }),
    { levelName: 'Demo Practice', aiSpeed: 150.5, ballSpeed: 280, isActive: true })
  for (const levelName of ['', '_Invalid', 'Bad/name', 'A'.repeat(33)]) {
    assert.throws(() => difficultyPayload({ levelName, aiSpeed: 200, ballSpeed: 300, isActive: false }))
  }
  for (const speed of ['', 'no', 'Infinity', '-1', '2001']) {
    assert.throws(() => difficultyPayload({ levelName: 'Valid', aiSpeed: speed, ballSpeed: 300, isActive: true }))
  }
  assert.equal(difficultyPayload({ levelName: 'Hard', aiSpeed: 1, ballSpeed: 2000, isActive: false }).isActive, false)
})

test('known match and preference references prevent difficulty deletion in the interface', () => {
  assert.equal(difficultyIsUsed({ users: [], matches: [] }, 'level'), false)
  assert.equal(difficultyIsUsed({ users: [{ preferredDifficultyId: 'level' }], matches: [] }, 'level'), true)
  assert.equal(difficultyIsUsed({ users: [], matches: [{ difficultyId: 'level' }] }, 'level'), true)
})
