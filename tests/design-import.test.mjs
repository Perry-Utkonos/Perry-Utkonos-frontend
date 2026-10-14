import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'

execFileSync(process.execPath, [new URL('../design/build-import.mjs', import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/, '')])
const body = fs.readFileSync(new URL('../design/figma-import.generated.js', import.meta.url), 'utf8')
const state = JSON.parse(fs.readFileSync(new URL('../design/figma-state.json', import.meta.url), 'utf8'))
const fingerprint = body.match(/"fingerprint":"([a-f0-9]+)"/)[1]
const execute = (figma) => new vm.Script(`(async () => {${body}})()`).runInNewContext({ figma })
const base = () => ({ fileKey: state.fileKey, currentPage: { children: [], findOne: () => null }, getImageByHash: () => null })

test('the same generated version is a no-op before creating nodes or variables', async () => {
  const figma = base()
  figma.currentPage.children = [{ id: 'test-section', getPluginData: (key) => key === 'fate/source' ? fingerprint : '{"screens":{}}' }]
  const result = await execute(figma)
  assert.equal(result.status, 'unchanged')
  assert.equal(result.section, 'test-section')
})

test('a changed version refuses to overwrite the existing design', async () => {
  const figma = base()
  figma.currentPage.children = [{ getPluginData: () => 'old-version' }]
  await assert.rejects(execute(figma), /another generated version/)
})

test('wrong files, unversioned designs and missing images fail before mutations', async () => {
  await assert.rejects(execute({ ...base(), fileKey: 'another-file' }), /Open the file/)
  const existing = base()
  existing.currentPage.findOne = () => ({ id: 'old-section' })
  await assert.rejects(execute(existing), /unversioned Fate/)
  await assert.rejects(execute(base()), /Portrait image is missing/)
})
