import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const source = ts.transpileModule(fs.readFileSync(new URL('../src/components/pageTransition.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { transitionToPage, getPageMotion, setPageMotion } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('site motion choice enables slides despite OS reduced motion, preserves explicit fade, and handles rapid navigation', async (t) => {
  const animations = []
  const snapshots = []
  const animate = (frames) => {
    let finish
    const animation = { frames, canceled: false, cancel() { this.canceled = true }, finished: new Promise((resolve) => { finish = resolve }), finish: () => finish() }
    animations.push(animation)
    return animation
  }
  const clone = { inert: false, removeAttribute() {} }
  const content = { animate, cloneNode: () => clone }
  const snapshot = { animate, replaceChildren: (...children) => { snapshots.splice(0, snapshots.length, ...children) } }
  const previousDocument = globalThis.document
  const previousWindow = globalThis.window
  globalThis.document = { querySelector: (selector) => selector === '[data-route-content]' ? content : snapshot }
  const storage = new Map()
  globalThis.window = { matchMedia: () => ({ matches: true }), localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } }
  t.after(() => { setPageMotion('slide'); globalThis.document = previousDocument; globalThis.window = previousWindow })

  assert.equal(getPageMotion(), 'slide')
  transitionToPage(() => {})
  assert.equal(animations.length, 2)
  assert.ok(animations.every((animation) => animation.frames.some((frame) => frame.transform?.includes('translateX'))), 'Windows reduced motion must not override the site default')
  animations[1].finish()
  await Promise.resolve()
  animations.length = 0

  setPageMotion('fade')
  assert.equal(getPageMotion(), 'fade')
  assert.equal(storage.get('fate-page-motion'), 'fade')

  let navigations = 0
  transitionToPage(() => navigations++)
  assert.equal(navigations, 1, 'navigation must happen before either animation finishes')
  assert.equal(animations.length, 2, 'fade preference must not skip the crossfade')
  assert.ok(animations.every((animation) => animation.frames.every((frame) => 'opacity' in frame && !('transform' in frame))), 'explicit fade preference changes opacity without moving screens')
  assert.deepEqual(snapshots, [clone])
  assert.equal(clone.inert, true)
  animations[1].finish()
  await Promise.resolve()
  assert.deepEqual(snapshots, [])
  assert.ok(animations.every((animation) => animation.canceled))

  transitionToPage(() => navigations++)
  const interrupted = animations.slice(2)
  transitionToPage(() => navigations++)
  assert.ok(interrupted.every((animation) => animation.canceled), 'rapid navigation cancels the previous effect')
  assert.equal(snapshots.length, 1, 'rapid navigation must not stack departing pages')
  animations.at(-1).finish()
  await Promise.resolve()
  assert.equal(navigations, 3)
  assert.equal(snapshots.length, 0)

  globalThis.window.localStorage = { getItem() { throw new Error('Storage blocked') }, setItem() { throw new Error('Storage blocked') } }
  setPageMotion('slide')
  assert.equal(getPageMotion(), 'slide', 'choice remains usable when storage is unavailable')
})
