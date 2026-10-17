import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = ts.transpileModule(fs.readFileSync(new URL('../src/chatTime.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { chatDayKey, formatMessageTime, formatConversationTime, formatMessageDate } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('message timestamps always use HH:mm, even for previous days and years', () => {
  assert.equal(formatMessageTime(new Date(2026, 9, 18, 7, 5).toISOString()), '07:05')
  assert.equal(formatMessageTime(new Date(2024, 0, 2, 0, 3).toISOString()), '00:03')
  assert.equal(formatMessageTime(new Date(2024, 0, 2, 23, 59).toISOString()), '23:59')
  const now = new Date(2026, 9, 18, 23, 59)
  const value = new Date(2026, 9, 18, 7, 5).toISOString()
  assert.equal(formatConversationTime(value, now), formatMessageTime(value))
})

test('chat list dates and message day labels use local calendar dates and retain past years', () => {
  const now = new Date(2026, 9, 18, 12)
  const beforeMidnight = new Date(2026, 9, 17, 23, 59).toISOString()
  const afterMidnight = new Date(2026, 9, 18, 0, 1).toISOString()
  assert.equal(chatDayKey(beforeMidnight), '2026-10-17')
  assert.equal(chatDayKey(afterMidnight), '2026-10-18')
  assert.notEqual(formatConversationTime(beforeMidnight, now), '23:59')
  assert.equal(formatConversationTime(afterMidnight, now), '00:01')
  assert.equal(formatMessageDate(beforeMidnight, now), '17 октября')
  assert.match(formatMessageDate(new Date(2024, 0, 2).toISOString(), now), /2024/)
  assert.match(formatConversationTime(new Date(2024, 0, 2).toISOString(), now), /2024/)
})

test('missing or invalid timestamps do not leak Invalid Date into the interface', () => {
  for (const value of [null, '', 'not-a-date']) {
    assert.equal(formatMessageTime(value), '')
    assert.equal(formatConversationTime(value), '')
  }
  assert.equal(chatDayKey('bad-date'), null)
  assert.equal(formatMessageDate('bad-date'), '')
})
