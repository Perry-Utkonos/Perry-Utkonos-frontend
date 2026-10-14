import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

// Transpile the small pure state module using the project's existing TypeScript dependency.
const source = ts.transpileModule(fs.readFileSync(new URL('../src/data/chatState.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { addMessage, getChatPreviews } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('sending updates the conversation and chat preview without mutating initial data', () => {
  const initial = { mila: [{ id: 1, text: 'Привет', time: '12:00', fromMe: false }] }
  const previews = [{ userId: 'mila', lastMessage: 'Старое превью', time: 'Вчера', unread: 2 }]
  const next = addMessage(initial, 'mila', { id: 2, text: 'До встречи', time: '12:01', fromMe: true })
  assert.equal(initial.mila.length, 1)
  assert.equal(next.mila.length, 2)
  assert.deepEqual(getChatPreviews(next, previews), [{ userId: 'mila', lastMessage: 'До встречи', time: '12:01', unread: 2 }])
})

test('a new conversation becomes visible in the list and rapid messages have unique IDs', () => {
  const first = addMessage({}, 'sasha', { id: 123, text: 'Первое', time: '12:00', fromMe: true })
  const second = addMessage(first, 'sasha', { id: 123, text: 'Второе', time: '12:00', fromMe: true })
  assert.equal(new Set(second.sasha.map((message) => message.id)).size, 2)
  assert.deepEqual(getChatPreviews(second, []), [{ userId: 'sasha', lastMessage: 'Второе', time: '12:00', unread: 0 }])
})

test('empty initial conversations retain their preview; empty unknown conversations are omitted', () => {
  const previews = [{ userId: 'mila', lastMessage: 'Привет', time: 'Вчера', unread: 0 }]
  assert.deepEqual(getChatPreviews({ mila: [], sasha: [] }, previews), previews)
})
