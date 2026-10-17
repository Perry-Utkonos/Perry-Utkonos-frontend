import { ApiClient } from './client'

export const api = new ApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || '/api' })
export const hubUrl = import.meta.env.VITE_HUB_URL || '/hubs/chat'
