import type { AuthResponse, ConversationDto, LikeResult, LikesDto, LoginRequest, MessagePage, PaymentDto, ProfileDto, ProfileUpdate, RecommendationDto, RegisterRequest } from './contracts'

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiError' }
}

const SESSION_KEY = 'fate-session'
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
interface ClientOptions { baseUrl?: string; fetch?: typeof fetch; storage?: SessionStorage | null }

export class ApiClient {
  readonly baseUrl: string
  private readonly transport: typeof fetch
  private readonly storage: SessionStorage | null
  private session: AuthResponse | null = null
  private revision = 0
  private identityRevision = 0
  private refreshing: Promise<string> | null = null
  private listeners = new Set<() => void>()

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '/api').replace(/\/$/, '')
    this.transport = options.fetch ?? globalThis.fetch.bind(globalThis)
    try { this.storage = options.storage === undefined ? globalThis.sessionStorage ?? null : options.storage }
    catch { this.storage = null }
    try {
      const value = JSON.parse(this.storage?.getItem(SESSION_KEY) ?? 'null') as AuthResponse | null
      if (value?.accessToken && value.refreshToken && value.user?.id && value.accessTokenExpiresAt) this.session = value
    } catch { /* An unavailable or damaged browser session must not crash startup. */ }
  }

  getSession() { return this.session }
  setSession(value: AuthResponse | null, tokenRotation = false) {
    this.revision++
    if (!tokenRotation) this.identityRevision++
    this.session = value
    try {
      if (value) this.storage?.setItem(SESSION_KEY, JSON.stringify(value))
      else this.storage?.removeItem(SESSION_KEY)
    } catch { /* The current tab can continue with an in-memory session. */ }
    this.listeners.forEach((listener) => listener())
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }

  private async refresh(): Promise<string> {
    if (this.refreshing) return this.refreshing
    const previous = this.session
    const revision = this.revision
    if (!previous) throw new ApiError('Войдите в аккаунт.', 401)
    const operation = (async () => {
      try {
        const result = await this.request<AuthResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: previous.refreshToken }) }, false)
        if (this.revision !== revision) throw new ApiError('Сеанс изменился. Повторите вход.', 401)
        this.setSession(result, true)
        return result.accessToken
      } catch (error) {
        if (this.revision === revision && error instanceof ApiError && [401, 403].includes(error.status)) this.setSession(null)
        throw error
      }
    })()
    this.refreshing = operation
    try { return await operation } finally { if (this.refreshing === operation) this.refreshing = null }
  }

  async getAccessToken(): Promise<string> {
    const session = this.session
    if (!session) throw new ApiError('Войдите в аккаунт.', 401)
    if (new Date(session.accessTokenExpiresAt).getTime() - Date.now() < 30_000) return this.refresh()
    return session.accessToken
  }

  async request<T>(path: string, options: RequestInit = {}, authorized = true): Promise<T> {
    const identity = this.identityRevision
    const checkIdentity = () => { if (authorized && identity !== this.identityRevision) throw new ApiError('Аккаунт изменился. Повторите действие.', 401) }
    const send = async (token?: string) => {
      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json')
      if (options.body != null && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
      if (token) headers.set('Authorization', `Bearer ${token}`)
      try { return await this.transport(this.baseUrl + path, { ...options, headers, cache: 'no-store' }) }
      catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error
        throw new ApiError('Не удалось связаться с сервером. Проверьте подключение и повторите попытку.', 0)
      }
    }
    const revision = this.revision
    const initialToken = authorized ? await this.getAccessToken() : undefined
    checkIdentity()
    let response = await send(initialToken)
    checkIdentity()
    if (authorized && response.status === 401) {
      if (!this.session) throw new ApiError('Сеанс завершён. Войдите снова.', 401)
      // Another simultaneous request may already have rotated this session's token.
      const token = this.revision === revision ? await this.refresh() : await this.getAccessToken()
      checkIdentity()
      response = await send(token)
      checkIdentity()
      if (response.status === 401) this.setSession(null)
    }
    const text = await response.text()
    checkIdentity()
    let data: unknown = null
    try { data = text ? JSON.parse(text) : null } catch {
      throw new ApiError('Сервер вернул неожиданный ответ. Проверьте адрес API и настройки прокси.', response.status)
    }
    if (!response.ok) {
      const problem = data as { error?: string; title?: string; errors?: Record<string, string[]> } | null
      const details = problem?.errors ? Object.values(problem.errors).flat().join(' ') : null
      throw new ApiError(details || problem?.error || problem?.title || `Ошибка сервера (${response.status}).`, response.status)
    }
    return data as T
  }

  async login(body: LoginRequest) { const result = await this.request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }, false); this.setSession(result); return result }
  async register(body: RegisterRequest) { const result = await this.request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }, false); this.setSession(result); return result }
  getMe() { return this.request<ProfileDto>('/me') }
  updateMe(body: ProfileUpdate) { return this.request<ProfileDto>('/me', { method: 'PATCH', body: JSON.stringify(body) }) }
  profiles(signal?: AbortSignal, limit = 100, offset = 0) { return this.request<ProfileDto[]>(`/profiles?limit=${limit}&offset=${offset}`, { signal }) }
  profile(id: string) { return this.request<ProfileDto>(`/profiles/${encodeURIComponent(id)}`) }
  likes(signal?: AbortSignal) { return this.request<LikesDto>('/likes', { signal }) }
  like(id: string) { return this.request<LikeResult>('/likes', { method: 'POST', body: JSON.stringify({ targetUserId: id }) }) }
  conversations() { return this.request<ConversationDto[]>('/conversations') }
  createConversation(peerId: string) { return this.request<ConversationDto>('/conversations', { method: 'POST', body: JSON.stringify({ peerId }) }) }
  messages(id: string, before?: number) { return this.request<MessagePage>(`/conversations/${encodeURIComponent(id)}/messages?limit=50${before == null ? '' : `&before=${before}`}`) }
  recommendations(signal?: AbortSignal) { return this.request<RecommendationDto[]>('/recommendations', { signal }) }
  payments() { return this.request<PaymentDto[]>('/payments') }
  createPayment() { return this.request<PaymentDto>('/payments', { method: 'POST', body: JSON.stringify({ amount: 499, currency: 'RUB', purpose: 'Подробный расклад' }) }) }
}
