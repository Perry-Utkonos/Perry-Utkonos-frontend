let clearTransition: (() => void) | undefined
export type PageMotion = 'slide' | 'fade'
let memoryMotion: PageMotion = 'slide'

export function getPageMotion(): PageMotion {
  try {
    const stored = window.localStorage.getItem('fate-page-motion')
    return stored === 'fade' || stored === 'slide' ? stored : memoryMotion
  } catch { return memoryMotion }
}

export function setPageMotion(value: PageMotion) {
  memoryMotion = value
  try { window.localStorage.setItem('fate-page-motion', value) } catch { /* Keep the choice for this tab when storage is unavailable. */ }
}

export function transitionToPage(navigate: () => void) {
  clearTransition?.()
  const content = document.querySelector<HTMLElement>('[data-route-content]')
  const snapshot = document.querySelector<HTMLElement>('[data-route-snapshot]')
  if (!content || !snapshot || !content.animate) {
    navigate()
    return
  }
  const fadeOnly = getPageMotion() === 'fade'

  // Keep only a visual copy of the outgoing screen, without mounting a second
  // React tree or running its effects. The real page changes immediately.
  const outgoing = content.cloneNode(true) as HTMLElement
  outgoing.inert = true
  outgoing.removeAttribute('data-route-content')
  snapshot.replaceChildren(outgoing)
  try { navigate() } catch (error) { snapshot.replaceChildren(); throw error }

  // The site's explicit motion setting controls the effect on every platform.
  const exit = snapshot.animate(fadeOnly ? [
    { opacity: 1 }, { opacity: 0 },
  ] : [
    { opacity: 1, transform: 'translateX(0)' },
    { opacity: 0, transform: 'translateX(-12px)' },
  ], { duration: fadeOnly ? 280 : 220, easing: 'ease-in-out', fill: 'both' })
  const enter = content.animate(fadeOnly ? [
    { opacity: 0 }, { opacity: 1 },
  ] : [
    { opacity: 0, transform: 'translateX(18px)' },
    { opacity: 1, transform: 'translateX(0)' },
  ], { duration: fadeOnly ? 280 : 300, easing: 'ease-in-out', fill: 'both' })

  const cleanup = () => {
    exit.cancel()
    enter.cancel()
    snapshot.replaceChildren()
    if (clearTransition === cleanup) clearTransition = undefined
  }
  clearTransition = cleanup
  void enter.finished.then(cleanup, () => undefined)
}
