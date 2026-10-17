import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

// Load the actual demo client and fixtures without adding a test runner dependency.
function moduleUrl(relative) {
  const url = new URL(relative, import.meta.url)
  const source = ts.transpileModule(fs.readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from ['"](\.[^'"]+)['"]/g, (_match, path) => `from '${moduleUrl(new URL(`${path}.ts`, url).href)}'`)
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}
const { LocalDemoClient } = await import(moduleUrl('../src/api/demo.ts'))
const { allowLocalDemo } = await import(moduleUrl('../src/api/demoMode.ts'))

test('demo access requires both development mode and a loopback hostname', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]', '::1']) assert.equal(allowLocalDemo(true, 'demo', host), true)
  for (const host of ['example.com', '192.168.1.2', '100.64.0.1', 'my-computer.example.ts.net', 'localhost.example.com', '']) assert.equal(allowLocalDemo(true, 'demo', host), false)
  assert.equal(allowLocalDemo(false, 'demo', 'localhost'), false)
  assert.equal(allowLocalDemo(true, 'development', 'localhost'), false)
})

test('demo enters without registration and supports profile, likes, conversations and local messages', async () => {
  const client = new LocalDemoClient()
  const profile = await client.getMe()
  assert.equal(profile.id, 'me')
  assert.equal((await client.profiles()).length, 4)
  assert.equal((await client.profiles(undefined, 2, 2)).length, 2)
  assert.equal((await client.profile('mila')).displayName, 'Мила')
  assert.equal((await client.recommendations()).length, 4)
  assert.equal((await client.conversations()).length, 3)

  const match = await client.like('sasha')
  assert.equal(match.isMatch, true)
  assert.deepEqual((await client.likes()).likedUserIds, ['sasha'])
  const conversation = await client.createConversation('sasha')
  assert.equal(match.conversationId, conversation.id)
  const sent = await client.sendMessage(conversation.id, 'Тест', 'message-1')
  assert.deepEqual(await client.sendMessage(conversation.id, 'Тест', 'message-1'), sent)
  assert.equal((await client.messages(conversation.id)).items.length, 1)
  assert.equal((await client.messages(conversation.id, sent.seq)).items.length, 0)
  assert.equal((await client.conversations())[0].lastMessageBody, 'Тест')

  const mila = (await client.conversations()).find((item) => item.peer.id === 'mila')
  assert.equal(mila.unreadCount, 2)
  await client.markRead(mila.id, mila.lastSeq)
  assert.equal((await client.conversations()).find((item) => item.id === mila.id).unreadCount, 0)
  const { id, username, lastSeenAt, age, ...update } = profile
  const updated = await client.updateMe({ ...update, displayName: 'Тестовое имя' })
  assert.equal(updated.displayName, 'Тестовое имя')
  assert.equal((await client.getMe()).displayName, 'Тестовое имя')
  assert.equal((await client.createPayment()).status, 'pending')
  assert.equal((await client.payments()).length, 1)
})

test('demo isolates sessions and fixture changes, resets on a new page and respects cancellation', async () => {
  const client = new LocalDemoClient()
  const profile = await client.getMe()
  profile.photos.length = 0
  assert.ok((await client.getMe()).photos.length > 0)
  await client.like('mila')
  assert.deepEqual((await new LocalDemoClient().likes()).likedUserIds, [])
  client.setSession(null)
  await assert.rejects(client.getMe(), (error) => error.status === 401)
  client.enter()
  assert.equal((await client.getMe()).id, 'me')
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(client.profiles(controller.signal), { name: 'AbortError' })
  await assert.rejects(client.profile('unknown'), (error) => error.status === 404)
})
