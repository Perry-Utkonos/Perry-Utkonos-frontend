export type Theme = 'purple' | 'cream'

export function getInitialTheme(): Theme {
  try { return window.localStorage.getItem('fate-theme') === 'purple' ? 'purple' : 'cream' }
  catch { return 'cream' }
}
