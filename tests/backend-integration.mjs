import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import ts from 'typescript'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'

// Run explicitly against an isolated, real ASP.NET + PostgreSQL deployment:
// FATE_TEST_API=http://127.0.0.1:8080/api node --test tests/backend-integration.mjs
// This creates three disposable accounts and messages; never target a live user database.
const apiUrl = process.env.FATE_TEST_API
const hubUrl = process.env.FATE_TEST_HUB ?? (apiUrl ? new URL('/hubs/chat', apiUrl).href : '')
const source = ts.transpileModule(fs.readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { ApiClient, ApiError } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const chatSource = ts.transpileModule(fs.readFileSync(new URL('../src/hooks/chatMessages.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { fetchCatchup } = await import(`data:text/javascript;base64,${Buffer.from(chatSource).toString('base64')}`)

const eventDuring = async (hub, name, predicate, operation) => {
  let timer, handler
  const received = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out waiting for ${name}`)), 10_000)
    handler = (...args) => { if (predicate(...args)) resolve(args) }
    hub.on(name, handler)
  })
  try {
    // A broadcast can arrive before the invocation acknowledgement. Wait for
    // both so the test observes the complete protocol rather than racing it.
    const [args] = await Promise.all([received, Promise.resolve().then(operation)])
    return args
  } finally { clearTimeout(timer); hub.off(name, handler) }
}

test('real backend: accounts, persistence, bearer auth, mutual likes and SignalR chat', { skip: !apiUrl, timeout: 120_000 }, async (t) => {
  const suffix = randomUUID().slice(0, 8)
  const clients = ['alice', 'bob', 'mallory'].map(() => new ApiClient({ baseUrl: apiUrl, storage: null }))
  const [alice, bob, mallory] = clients
  const hubs = clients.map((client) => new HubConnectionBuilder()
    .withUrl(hubUrl, { accessTokenFactory: () => client.getAccessToken() })
    .withAutomaticReconnect([0, 100, 500])
    .configureLogging(LogLevel.None)
    .build())
  const [aliceHub, bobHub, malloryHub] = hubs
  t.after(async () => { await Promise.allSettled(hubs.map((hub) => hub.stop())) })
  const password = 'Integration-Password-42!'
  let aliceId, bobId, conversationId

  await t.test('HTTP endpoints reject missing authentication and the old spoofable X-User-Id header', async () => {
    const response = await fetch(`${apiUrl}/profiles`, { headers: { 'X-User-Id': randomUUID() } })
    assert.equal(response.status, 401)
    const health = await fetch(`${apiUrl}/health`)
    assert.equal(health.status, 200)
    assert.equal((await health.json()).status, 'ok')
  })

  await t.test('register, login and refresh rotate real tokens and reject a reused refresh token', async () => {
    for (const [index, name] of ['alice', 'bob', 'mallory'].entries()) {
      const result = await clients[index].register({ username: `${name}_${suffix}`, email: `${name}_${suffix}@example.test`, password, displayName: name })
      assert.match(result.user.id, /^[0-9a-f-]{36}$/)
      assert.ok(result.accessToken)
      assert.ok(result.refreshToken)
    }
    aliceId = alice.getSession().user.id
    bobId = bob.getSession().user.id
    await alice.login({ usernameOrEmail: `alice_${suffix}`, password })
    const oldRefresh = alice.getSession().refreshToken
    const refreshed = await alice.request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: oldRefresh }) }, false)
    assert.notEqual(refreshed.refreshToken, oldRefresh)
    alice.setSession(refreshed)
    await assert.rejects(alice.request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: oldRefresh }) }, false), (error) => error instanceof ApiError && error.status === 401)
    assert.equal((await alice.getMe()).id, aliceId)
  })

  await t.test('profile changes persist in PostgreSQL and the feed contains real other accounts', async () => {
    const profile = { displayName: 'Alice Integration', birthDate: '1997-05-10', city: 'Казань', bio: 'Проверка реального API', interests: ['Книги'], sign: 'taurus', photos: [], goals: ['Общение'], gender: null, avatarUrl: null }
    await alice.updateMe(profile)
    const saved = await alice.getMe()
    assert.equal(saved.city, profile.city)
    assert.equal(saved.bio, profile.bio)
    assert.deepEqual(saved.interests, profile.interests)
    const feed = await alice.profiles()
    assert.ok(feed.some((user) => user.id === bobId))
    assert.ok(!feed.some((user) => user.id === aliceId))
    assert.equal((await bob.profile(aliceId)).displayName, profile.displayName)
  })

  await t.test('mutual likes create one shared conversation while both hub connections are already open', async () => {
    await Promise.all(hubs.map((hub) => hub.start()))
    assert.equal((await alice.like(bobId)).isMatch, false)
    const reciprocal = await bob.like(aliceId)
    assert.equal(reciprocal.isMatch, true)
    assert.ok(reciprocal.conversationId)
    conversationId = reciprocal.conversationId
    assert.equal((await alice.createConversation(bobId)).id, conversationId)
    assert.equal((await bob.createConversation(aliceId)).id, conversationId)
    assert.ok((await alice.likes()).likedUserIds.includes(bobId))
    assert.ok((await alice.likes()).incomingUserIds.includes(bobId))
  })

  await t.test('message acknowledgement and live delivery share one server ID; retry is idempotent', async () => {
    const messageId = randomUUID()
    const body = 'Привет из настоящего SignalR 👋'
    const received = []
    const collect = (message) => { if (message.id === messageId) received.push(message) }
    bobHub.on('ReceiveMessage', collect)
    let ack
    await eventDuring(bobHub, 'ReceiveMessage', (message) => message.id === messageId, async () => {
      ack = await aliceHub.invoke('SendMessage', conversationId, messageId, body)
    })
    assert.equal(ack.id, messageId)
    assert.equal(ack.senderId, aliceId)
    assert.equal(ack.body, body)
    const repeated = await aliceHub.invoke('SendMessage', conversationId, messageId, body)
    assert.equal(repeated.id, messageId)
    const history = await bob.messages(conversationId)
    assert.equal(history.items.filter((message) => message.id === messageId).length, 1)
    assert.equal(received.length, 1)
    bobHub.off('ReceiveMessage', collect)
    await assert.rejects(mallory.messages(conversationId), (error) => error instanceof ApiError && error.status === 403)
    await assert.rejects(malloryHub.invoke('SendMessage', conversationId, messageId, body))

    // Separate connections are important: SignalR serializes invocations on one
    // connection, which would hide a database race between simultaneous retries.
    const secondAliceHub = new HubConnectionBuilder().withUrl(hubUrl, { accessTokenFactory: () => alice.getAccessToken() }).configureLogging(LogLevel.None).build()
    hubs.push(secondAliceHub)
    await secondAliceHub.start()
    const racingId = randomUUID()
    const simultaneous = await Promise.all([
      aliceHub.invoke('SendMessage', conversationId, racingId, 'Concurrent retry'),
      secondAliceHub.invoke('SendMessage', conversationId, racingId, 'Concurrent retry'),
    ])
    assert.equal(simultaneous[0].id, racingId)
    assert.equal(simultaneous[1].id, racingId)
    assert.equal(simultaneous[0].seq, simultaneous[1].seq)
    assert.equal((await bob.messages(conversationId)).items.filter((item) => item.id === racingId).length, 1)
    await secondAliceHub.stop()
  })

  await t.test('message history paginates without gaps or duplicate IDs and read receipts clear unread counts', async () => {
    for (let index = 0; index < 52; index++) await aliceHub.invoke('SendMessage', conversationId, randomUUID(), `Pagination ${index + 1}`)
    const latest = await bob.messages(conversationId)
    assert.equal(latest.items.length, 50)
    assert.equal(latest.hasMore, true)
    assert.ok(latest.nextCursor)
    const older = await bob.messages(conversationId, latest.nextCursor)
    const all = [...latest.items, ...older.items]
    assert.equal(all.length, 54)
    assert.equal(new Set(all.map((message) => message.id)).size, 54)
    assert.deepEqual(all.map((message) => message.seq).sort((a, b) => a - b), Array.from({ length: 54 }, (_, index) => index + 1))
    assert.equal(older.hasMore, false)
    const lastSeq = Math.max(...all.map((message) => message.seq))
    await eventDuring(aliceHub, 'ReadReceipt', (id, userId, seq) => id === conversationId && userId === bobId && seq === lastSeq, () => bobHub.invoke('MarkRead', conversationId, lastSeq))
    assert.equal((await bob.conversations()).find((item) => item.id === conversationId).unreadCount, 0)
    await assert.rejects(malloryHub.invoke('MarkRead', conversationId, lastSeq))
  })

  await t.test('reconnecting re-joins conversations and history recovers messages sent while offline', async () => {
    const knownSeq = Math.max(...(await bob.messages(conversationId)).items.map((item) => item.seq))
    await bobHub.stop()
    const offlineIds = []
    for (let index = 0; index < 55; index++) {
      const id = randomUUID()
      offlineIds.push(id)
      await aliceHub.invoke('SendMessage', conversationId, id, 'Sent while peer was offline')
    }
    await bobHub.start()
    let historyPages = 0
    const catchup = await fetchCatchup((before) => { historyPages++; return bob.messages(conversationId, before) }, knownSeq)
    assert.ok(historyPages > 1)
    assert.ok(offlineIds.every((id) => catchup.items.some((message) => message.id === id)))
    const liveId = randomUUID()
    await eventDuring(bobHub, 'ReceiveMessage', (message) => message.id === liveId, () => aliceHub.invoke('SendMessage', conversationId, liveId, 'Live after reconnect'))
  })

  await t.test('a payment is persisted as pending and cannot be marked paid by the browser', async () => {
    const payment = await alice.createPayment()
    assert.equal(payment.userId, aliceId)
    assert.equal(payment.status.toLowerCase(), 'pending')
    assert.ok((await alice.payments()).some((item) => item.id === payment.id))
    const response = await fetch(`${apiUrl}/payments/${payment.id}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${await alice.getAccessToken()}` } })
    assert.ok([403, 404, 405, 501].includes(response.status))
    assert.equal((await alice.payments()).find((item) => item.id === payment.id).status.toLowerCase(), 'pending')
  })
})
