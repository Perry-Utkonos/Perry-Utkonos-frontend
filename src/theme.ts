export type Theme = 'purple' | 'cream'

export function getInitialTheme(): Theme {
  try { return window.localStorage.getItem('fate-theme') === 'cream' ? 'cream' : 'purple' }
  catch { return 'purple' }
}
