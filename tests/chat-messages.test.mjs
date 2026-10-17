import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = ts.transpileModule(fs.readFileSync(new URL('../src/hooks/chatMessages.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { mergeMessages, createMessageId, fetchCatchup } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const message = (id, seq, body = id) => ({ id, seq, body, conversationId: 'chat', senderId: 'peer', type: 0, replyToId: null, createdAt: '2026-10-17T00:00:00Z', editedAt: null, deletedAt: null })

test('history, SignalR events and send acknowledgements merge into one ordered conversation', () => {
  const current = [message('third', 3), message('fourth', 4)]
  const incoming = [message('second', 2), message('third', 3, 'updated on server'), message('first', 1)]
  const merged = mergeMessages(current, incoming)
  assert.deepEqual(merged.map((item) => item.id), ['first', 'second', 'third', 'fourth'])
  assert.equal(merged[2].body, 'updated on server')
  assert.equal(mergeMessages(merged, [message('fourth', 4)]).length, 4)
  assert.deepEqual(current.map((item) => item.id), ['third', 'fourth'])
  assert.equal(current[0].body, 'third')
})

test('message IDs remain valid UUIDv4 values when randomUUID is unavailable on HTTP LAN pages', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  let randomCalls = 0
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
      getRandomValues(bytes) { randomCalls++; return bytes.fill(255) },
    } })
    const id = createMessageId()
    assert.equal(id, 'ffffffff-ffff-4fff-bfff-ffffffffffff')
    assert.equal(randomCalls, 1)
  } finally {
    Object.defineProperty(globalThis, 'crypto', original)
  }
})

test('reconnect fills an offline gap larger than 50 messages while preserving the first-page pagination cursor', async () => {
  const calls = []
  const page = (first, last, hasMore) => ({
    items: Array.from({ length: last - first + 1 }, (_, index) => message(`message-${first + index}`, first + index)),
    nextCursor: hasMore ? first : null,
    hasMore,
  })
  const firstPage = page(102, 151, true)
  const result = await fetchCatchup(async (before) => {
    calls.push(before)
    if (before === undefined) return firstPage
    if (before === 102) return page(52, 101, true)
    if (before === 52) return page(2, 51, true)
    throw new Error(`Unexpected cursor ${before}`)
  }, 1)
  assert.deepEqual(calls, [undefined, 102, 52])
  assert.deepEqual(result.items.map((item) => item.seq), Array.from({ length: 150 }, (_, index) => index + 2))
  assert.equal(result.firstPage, firstPage)
  assert.equal(result.firstPage.nextCursor, 102)
})

test('first load remains one page and catchup stops as soon as it reaches known history', async () => {
  for (const knownSeq of [0, 9, 10]) {
    let calls = 0
    const result = await fetchCatchup(async () => { calls++; return { items: [message('ten', 10), message('eleven', 11)], nextCursor: 10, hasMore: true } }, knownSeq)
    assert.equal(calls, 1)
    assert.deepEqual(result.items.map((item) => item.seq), [10, 11])
  }
})

test('a newer live event does not hide an offline gap when catchup uses the REST watermark', async () => {
  const cached = Array.from({ length: 50 }, (_, index) => message(`m-${index + 1}`, index + 1))
  const live = mergeMessages(cached, [message('m-200', 200)])
  const calls = []
  const result = await fetchCatchup(async (before) => {
    calls.push(before)
    const last = before == null ? 200 : before - 1
    const first = Math.max(1, last - 49)
    return {
      items: Array.from({ length: last - first + 1 }, (_, index) => message(`m-${first + index}`, first + index)),
      nextCursor: first > 1 ? first : null,
      hasMore: first > 1,
    }
  }, 50)
  assert.deepEqual(calls, [undefined, 151, 101])
  assert.deepEqual(mergeMessages(live, result.items).map((item) => item.seq), Array.from({ length: 200 }, (_, index) => index + 1))
})

test('catchup rejects non-progressing or missing cursors instead of looping or silently skipping messages', async () => {
  for (const nextCursor of [null, 0, -1, 1.5, Number.NaN]) {
    await assert.rejects(fetchCatchup(async () => ({ items: [message('hundred', 100)], nextCursor, hasMore: true }), 1))
  }
  let calls = 0
  await assert.rejects(fetchCatchup(async () => {
    calls++
    return { items: [message('hundred', 100)], nextCursor: 100, hasMore: true }
  }, 1))
  assert.equal(calls, 2)
})
