import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import ts from 'typescript'

// These are HTTP contract tests of the browser client. The local server below is
// a protocol fixture, not a replacement for testing the ASP.NET/PostgreSQL stack.
const source = ts.transpileModule(fs.readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { ApiClient, ApiError } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

const account = { id: 'user-1', username: 'rodik', email: 'rodik@example.test', displayName: 'Rodik', avatarUrl: null, lastSeenAt: null }
const session = (suffix = 'old', expired = false) => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  accessTokenExpiresAt: new Date(Date.now() + (expired ? -60_000 : 3_600_000)).toISOString(),
  user: account,
})
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const memoryStorage = () => {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
}

test('login, profile, likes, conversation and history use the real HTTP routes and bearer contract', async (t) => {
  const requests = []
  const authorizedSession = session('login')
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const part of req) raw += part
    requests.push({ method: req.method, url: req.url, authorization: req.headers.authorization, contentType: req.headers['content-type'], body: raw ? JSON.parse(raw) : null })
    res.setHeader('Content-Type', 'application/json')
    const responses = {
      '/api/auth/login': authorizedSession,
      '/api/me': { ...account, city: 'Moscow' },
      '/api/likes': { targetUserId: 'peer-1', isMatch: false, conversationId: null },
      '/api/conversations': { id: 'conversation-1', peer: { ...account, id: 'peer-1' } },
      '/api/conversations/conversation-1/messages?limit=50&before=51': { items: [{ id: 'message-50', seq: 50 }], nextCursor: 1, hasMore: true },
    }
    res.end(JSON.stringify(responses[req.url] ?? { error: 'Unknown test route' }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const storage = memoryStorage()
  const client = new ApiClient({ baseUrl: `http://127.0.0.1:${server.address().port}/api/`, storage })
  let notifications = 0
  const unsubscribe = client.subscribe(() => notifications++)

  await client.login({ usernameOrEmail: 'rodik', password: 'test-password' })
  assert.equal((await client.getMe()).city, 'Moscow')
  assert.equal((await client.like('peer-1')).isMatch, false)
  assert.equal((await client.createConversation('peer-1')).id, 'conversation-1')
  const page = await client.messages('conversation-1', 51)
  assert.deepEqual(page, { items: [{ id: 'message-50', seq: 50 }], nextCursor: 1, hasMore: true })
  assert.equal(requests[0].authorization, undefined)
  assert.deepEqual(requests[0].body, { usernameOrEmail: 'rodik', password: 'test-password' })
  assert.equal(requests[1].contentType, undefined)
  assert.ok(requests.slice(1).every((request) => request.authorization === 'Bearer access-login'))
  assert.deepEqual(requests[2].body, { targetUserId: 'peer-1' })
  assert.deepEqual(requests[3].body, { peerId: 'peer-1' })
  assert.equal(new ApiClient({ storage }).getSession().accessToken, 'access-login')
  assert.equal(notifications, 1)
  unsubscribe()
  client.setSession(null)
  assert.equal(notifications, 1)
  assert.equal(new ApiClient({ storage }).getSession(), null)
})

test('simultaneous expired-token requests rotate the refresh token only once', async () => {
  const refresh = deferred()
  let refreshCalls = 0
  const authorizations = []
  const client = new ApiClient({ storage: null, fetch: async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCalls++
      assert.deepEqual(JSON.parse(options.body), { refreshToken: 'refresh-old' })
      assert.equal(options.headers.has('Authorization'), false)
      await refresh.promise
      return json(session('new'))
    }
    authorizations.push(options.headers.get('Authorization'))
    return json([])
  } })
  client.setSession(session('old', true))
  const first = client.conversations()
  const second = client.profiles()
  refresh.resolve()
  await Promise.all([first, second])
  assert.equal(refreshCalls, 1)
  assert.deepEqual(authorizations, ['Bearer access-new', 'Bearer access-new'])
  assert.equal(client.getSession().refreshToken, 'refresh-new')
})

test('a delayed 401 from another request reuses the newly rotated token', async () => {
  const delayedUnauthorized = deferred()
  const firstRetry = deferred()
  let protectedCalls = 0
  let refreshCalls = 0
  const client = new ApiClient({ storage: null, fetch: async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshCalls++; return json(session('rotated')) }
    protectedCalls++
    if (options.headers.get('Authorization') === 'Bearer access-old') {
      if (protectedCalls === 2) await delayedUnauthorized.promise
      return json({ error: 'Access token expired' }, 401)
    }
    firstRetry.resolve()
    return json([])
  } })
  client.setSession(session())
  const first = client.conversations()
  const second = client.profiles()
  await firstRetry.promise
  delayedUnauthorized.resolve()
  await Promise.all([first, second])
  assert.equal(refreshCalls, 1)
  assert.equal(protectedCalls, 4)
})

test('an invalid refresh session is removed from memory and storage', async () => {
  for (const status of [401, 403]) {
    const storage = memoryStorage()
    const client = new ApiClient({ storage, fetch: async () => json({ error: 'Refresh token revoked' }, status) })
    client.setSession(session('old', true))
    await assert.rejects(client.getAccessToken(), (error) => error instanceof ApiError && error.status === status)
    assert.equal(client.getSession(), null)
    assert.equal(new ApiClient({ storage }).getSession(), null)
  }
})

test('transient refresh failures retain the session and allow a later retry', async () => {
  let attempts = 0
  const client = new ApiClient({ storage: null, fetch: async () => {
    if (++attempts === 1) throw new TypeError('Network unavailable')
    return json(session('recovered'))
  } })
  client.setSession(session('old', true))
  await assert.rejects(client.getAccessToken(), (error) => error instanceof ApiError && error.status === 0)
  assert.equal(client.getSession().refreshToken, 'refresh-old')
  assert.equal(await client.getAccessToken(), 'access-recovered')
})

test('finishing an in-flight refresh cannot undo logout or replace a new login', async () => {
  for (const replacement of [null, session('another-login')]) {
    const response = deferred()
    const storage = memoryStorage()
    const client = new ApiClient({ storage, fetch: async () => response.promise })
    client.setSession(session('old', true))
    const refreshing = client.getAccessToken()
    client.setSession(replacement)
    response.resolve(json(session('too-late')))
    await assert.rejects(refreshing, (error) => error instanceof ApiError && error.status === 401)
    assert.deepEqual(client.getSession(), replacement)
    assert.deepEqual(new ApiClient({ storage }).getSession(), replacement)
  }
})

test('a stale 401 cannot replay an old write request after another login, even into the same account', async () => {
  for (const replacement of [session('same-account-login'), { ...session('account-b'), user: { ...account, id: 'user-2' } }]) {
    const response = deferred()
    const sent = []
    const client = new ApiClient({ storage: null, fetch: async (_url, options) => {
      sent.push({ authorization: options.headers.get('Authorization'), body: options.body })
      if (sent.length === 1) return response.promise
      return json({ targetUserId: 'peer-1', isMatch: false, conversationId: null })
    } })
    client.setSession(session('account-a'))
    const pending = client.like('peer-1')
    // Wait until the original request was issued before replacing its account.
    await Promise.resolve()
    client.setSession(null)
    client.setSession(replacement)
    response.resolve(json({ error: 'Access token expired' }, 401))
    await assert.rejects(pending, (error) => error instanceof ApiError && error.status === 401)
    assert.equal(sent.length, 1)
    assert.equal(sent[0].authorization, 'Bearer access-account-a')
    assert.deepEqual(client.getSession(), replacement)
  }
})

test('an old successful response is rejected after logout or account replacement', async () => {
  for (const replacement of [null, session('same-account-login'), { ...session('account-b'), user: { ...account, id: 'user-2' } }]) {
    const response = deferred()
    const client = new ApiClient({ storage: null, fetch: async () => response.promise })
    client.setSession(session('account-a'))
    const pending = client.getMe()
    await Promise.resolve()
    client.setSession(replacement)
    response.resolve(json({ ...account, city: 'Account A profile' }))
    await assert.rejects(pending, (error) => error instanceof ApiError && error.status === 401)
    assert.deepEqual(client.getSession(), replacement)
  }
})

test('JSON errors, ASP.NET validation problems and non-JSON proxy failures surface usable errors', async () => {
  const cases = [
    { response: json({ error: 'Peer not found' }, 404), status: 404, message: /Peer not found/ },
    { response: json({ title: 'Validation failed', errors: { Username: ['Required username.'], Password: ['Password too short.'] } }, 400), status: 400, message: /Required username.*Password too short/ },
    { response: new Response('<html>Bad Gateway</html>', { status: 502 }), status: 502, message: /API|прокси/ },
  ]
  for (const item of cases) {
    const client = new ApiClient({ storage: null, fetch: async () => item.response })
    await assert.rejects(client.request('/test', {}, false), (error) => error instanceof ApiError && error.status === item.status && item.message.test(error.message))
  }
})

test('an aborted profile request is not converted into an API failure or logout', async () => {
  const controller = new AbortController()
  const client = new ApiClient({ storage: null, fetch: async (_url, options) => {
    assert.equal(options.signal, controller.signal)
    throw new DOMException('The operation was aborted', 'AbortError')
  } })
  client.setSession(session())
  controller.abort()
  await assert.rejects(client.profiles(controller.signal), { name: 'AbortError' })
  assert.equal(client.getSession().accessToken, 'access-old')
})

test('profile pagination sends explicit limit and offset while preserving request cancellation', async () => {
  const controller = new AbortController()
  const requests = []
  const client = new ApiClient({ baseUrl: '/api', storage: null, fetch: async (url, options) => {
    requests.push({ url, signal: options.signal })
    return json([])
  } })
  client.setSession(session())
  await client.profiles(controller.signal, 50, 100)
  await client.profiles()
  assert.equal(requests[0].url, '/api/profiles?limit=50&offset=100')
  assert.equal(requests[0].signal, controller.signal)
  assert.equal(requests[1].url, '/api/profiles?limit=100&offset=0')
})

test('corrupt or unavailable browser storage does not break startup or login', async () => {
  const corrupt = new ApiClient({ storage: { getItem: () => 'not json', setItem() {}, removeItem() {} } })
  assert.equal(corrupt.getSession(), null)
  const unavailable = { getItem() { throw new Error('Access denied') }, setItem() { throw new Error('Quota') }, removeItem() { throw new Error('Access denied') } }
  const client = new ApiClient({ storage: unavailable, fetch: async () => json(session('memory-only')) })
  await client.register({ username: 'rodik', email: 'rodik@example.test', password: 'test-password' })
  assert.equal(client.getSession().accessToken, 'access-memory-only')
})
