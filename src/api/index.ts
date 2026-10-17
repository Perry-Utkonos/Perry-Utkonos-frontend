import { ApiClient } from './client'
import { LocalDemoClient } from './demo'
import { allowLocalDemo } from './demoMode'

export const demo = import.meta.env.DEV && allowLocalDemo(true, import.meta.env.MODE, window.location.hostname) ? new LocalDemoClient() : null
export const api: ApiClient = demo ?? new ApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || '/api' })
export const hubUrl = import.meta.env.VITE_HUB_URL || '/hubs/chat'
