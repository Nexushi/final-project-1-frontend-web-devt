import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApi, ApiError } from '../src/api/client.js'
import { createMatchSaver } from '../src/api/matchSaver.js'
import { mapDifficulty } from '../src/game/backendDifficulty.js'
import { createGame, stepGame, getMatchSummary } from '../src/game/engine.js'

const record = (changes = {}) => ({ id: 'match1', difficultyId: 'level1',
  difficultySnapshot: { levelName: 'Easy', aiSpeed: 140, ballSpeed: 240 },
  playerScore: 0, aiScore: 0, status: 'IN_PROGRESS', version: 0, ...changes })
const progress = (playerScore, aiScore = 0) => ({ playerScore, aiScore,
  status: playerScore === 5 || aiScore === 5 ? 'COMPLETED' : 'IN_PROGRESS' })
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

test('client uses actual endpoint methods, payloads, envelopes and configured origin', async () => {
  const requests = []
  const api = createApi({ baseUrl: 'https://example.test/', getToken: () => 'test-token', fetchImpl: async (url, options) => {
    requests.push({ url, ...options })
    if (options.method === 'DELETE') return new Response(null, { status: 204 })
    return json({ user: { username: 'sample' }, token: 'test-token', difficulties: [], matches: [], match: record() })
  } })
  await api.login({ username: 'sample', password: 'test-only' })
  await api.register({ username: 'sample', password: 'test-only' })
  await api.profile()
  await api.updateProfile({ username: 'renamed', preferredDifficultyId: 'level1' })
  await api.difficulties()
  await api.createMatch('level1')
  await api.matches()
  await api.match('match1')
  await api.saveMatch('match1', { ...progress(1), version: 0 })
  assert.equal(await api.deleteMatch('match1'), null)
  assert.deepEqual(requests.map(r => [r.method, new URL(r.url).pathname]), [
    ['POST', '/api/auth/login'], ['POST', '/api/auth/register'], ['GET', '/api/users/profile'],
    ['PUT', '/api/users/profile'], ['GET', '/api/difficulty'], ['POST', '/api/matches'],
    ['GET', '/api/matches'], ['GET', '/api/matches/match1'], ['PATCH', '/api/matches/match1'], ['DELETE', '/api/matches/match1'],
  ])
  for (const [index, request] of requests.entries()) {
    assert.equal(new URL(request.url).origin, 'https://example.test')
    assert.equal(request.redirect, 'error')
    assert.equal(request.credentials, 'omit')
    assert.equal(request.headers.Authorization, [0, 1, 4].includes(index) ? undefined : 'Bearer test-token')
  }
  assert.deepEqual(JSON.parse(requests[5].body), { difficultyId: 'level1' })
  assert.deepEqual(JSON.parse(requests[8].body), { ...progress(1), version: 0 })
})

test('untrusted match IDs cannot redirect tokens, and invalid API origins are rejected', async () => {
  let destination
  const api = createApi({ baseUrl: 'https://backend.test', fetchImpl: async url => { destination = url; return json({ match: record() }) } })
  await api.match('https://other.test/id')
  assert.equal(new URL(destination).origin, 'https://backend.test')
  for (const baseUrl of ['file:///tmp/a', 'https://name:secret@backend.test', 'https://backend.test/api', 'https://backend.test/?token=x']) {
    assert.throws(() => createApi({ baseUrl }))
  }
})

test('protected 401 expires session; invalid login and old-session 401 do not', async () => {
  let expired = 0, token = 'old'
  const api = createApi({ getToken: () => token, onUnauthorized: () => expired++, fetchImpl: async () => json({ message: 'Unauthorized' }, 401) })
  await assert.rejects(api.login({ username: 'bad', password: 'bad' }), { status: 401 })
  assert.equal(expired, 0)
  await assert.rejects(api.profile(), { status: 401 })
  assert.equal(expired, 1)
  const oldRequestApi = createApi({ getToken: () => token, onUnauthorized: () => expired++, fetchImpl: async () => {
    token = 'new'; return json({ message: 'Expired old token' }, 401)
  } })
  await assert.rejects(oldRequestApi.profile(), { status: 401 })
  assert.equal(expired, 1)
})

test('network, malformed responses, timeout, and validation errors are explicit', async () => {
  const offline = createApi({ fetchImpl: async () => { throw new TypeError('network detail') } })
  await assert.rejects(offline.matches(), err => err.status === 0 && err.message.includes('No save was confirmed') && !err.message.includes('network detail'))
  const bad = createApi({ fetchImpl: async () => new Response('not json') })
  await assert.rejects(bad.profile(), /invalid response/)
  const validation = createApi({ fetchImpl: async () => json({ message: 'Username is already taken' }, 409) })
  await assert.rejects(validation.updateProfile({ username: 'sample' }), { message: 'Username is already taken', status: 409 })
  const timeout = createApi({ timeoutMs: 5, fetchImpl: (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
  }) })
  await assert.rejects(timeout.matches(), { status: 0 })
})

test('point saver deduplicates in-flight and unchanged progress, preserves ID and latest version', async () => {
  const calls = []
  let release
  const saver = createMatchSaver({ saveMatch: (id, body) => {
    calls.push([id, body]); return new Promise(resolve => { release = () => resolve({ match: record({ ...body, version: body.version + 1 }) }) })
  } }, record())
  const first = saver.save({ ...progress(1), ignored: 'not sent' })
  assert.equal(saver.save(progress(1)), first)
  await assert.rejects(saver.save(progress(2)), /Wait for/)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], ['match1', { ...progress(1), version: 0 }])
  release(); await first
  await saver.save(progress(1))
  assert.equal(calls.length, 1)
  const second = saver.save(progress(2))
  assert.equal(calls[1][1].version, 1)
  release(); await second
  assert.equal(saver.getRecord().version, 2)
})

test('stale version locks saves without silently overwriting server progress', async () => {
  let writes = 0
  const saver = createMatchSaver({ saveMatch: async () => { writes++; throw new ApiError('Match changed; reload it before saving', 409) } }, record())
  await assert.rejects(saver.save(progress(1)), { status: 409 })
  await assert.rejects(saver.save(progress(1)), { status: 409 })
  assert.equal(writes, 1)
  assert.equal(saver.getRecord().version, 0)
})

test('lost save response is reconciled with GET; no duplicate completion write', async () => {
  let writes = 0, reads = 0
  const saver = createMatchSaver({
    saveMatch: async () => { writes++; throw new ApiError('timeout') },
    match: async () => { reads++; return { match: record({ ...progress(5, 3), version: 8 }) } },
  }, record({ ...progress(4, 3), version: 7 }))
  await assert.rejects(saver.save(progress(5, 3)), { status: 0 })
  assert.equal(saver.getRecord().playerScore, 4)
  const saved = await saver.save(progress(5, 3))
  assert.equal(saved.status, 'COMPLETED')
  assert.equal(saved.version, 8)
  assert.equal(writes, 1); assert.equal(reads, 1)
})

test('retry after failed network save reads first and writes only at unchanged version', async () => {
  let writes = 0, reads = 0
  const saver = createMatchSaver({
    saveMatch: async (_id, body) => { writes++; if (writes === 1) throw new ApiError('offline'); return { match: record({ ...body, version: 1 }) } },
    match: async () => { reads++; return { match: record() } },
  }, record())
  await assert.rejects(saver.save(progress(1)))
  await saver.save(progress(1))
  assert.equal(writes, 2); assert.equal(reads, 1)
  assert.equal(saver.getRecord().version, 1)
})

test('recovery rejects changed server version instead of rebasing unsaved points', async () => {
  let writes = 0
  const saver = createMatchSaver({
    saveMatch: async () => { writes++; throw new ApiError('offline') },
    match: async () => ({ match: record({ aiScore: 1, version: 1 }) }),
  }, record())
  await assert.rejects(saver.save(progress(1)))
  await assert.rejects(saver.save(progress(1)), { status: 409 })
  assert.equal(writes, 1)
})

test('resume restores scores and snapshot speeds, starts fresh serve, and save barrier freezes play', () => {
  const snapshot = { levelName: 'Hard', aiSpeed: 260, ballSpeed: 360 }
  const settings = mapDifficulty(snapshot)
  const game = createGame(settings.level, settings, record({ ...progress(3, 2), difficultySnapshot: snapshot }))
  assert.equal(game.scores.player, 3); assert.equal(game.scores.ai, 2)
  assert.equal(game.phase, 'serve'); assert.equal(game.ball.active, false)
  assert.equal(game.settings.speed, 260); assert.equal(game.settings.ballSpeed, 360)
  game.saving = true
  const before = JSON.stringify(game)
  for (let i = 0; i < 100; i++) stepGame(game, { x: 1, y: 1, swing: true }, 1 / 60)
  assert.equal(JSON.stringify(game), before)
  game.saving = false
  stepGame(game, { x: 0, y: 0, swing: true }, 1 / 60)
  assert.equal(getMatchSummary(game).phase, 'rally')
})

test('backend difficulty mapping retains units and named challenge presets', () => {
  const easy = mapDifficulty({ levelName: 'Easy', aiSpeed: 140, ballSpeed: 240 })
  const hard = mapDifficulty({ levelName: 'Hard', aiSpeed: 260, ballSpeed: 360 })
  assert.equal(easy.speed, 140); assert.equal(hard.ballSpeed, 360)
  assert.ok(easy.reaction > hard.reaction && easy.miss > hard.miss)
  assert.equal(mapDifficulty({ levelName: 'Custom', aiSpeed: 175, ballSpeed: 255 }).level, 'medium')
  assert.throws(() => mapDifficulty({ levelName: 'Easy', aiSpeed: '140', ballSpeed: 240 }), /invalid difficulty/)
})
