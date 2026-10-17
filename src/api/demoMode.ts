export function allowLocalDemo(development: boolean, mode: string, hostname: string) {
  const allowed = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname)
  return development && mode === 'demo' && allowed
}
