import { ApiClient, ApiError } from './client'
import type { AuthResponse, ConversationDto, MessageDto, PaymentDto, ProfileDto, ProfileUpdate } from './contracts'
import { me, users } from '../data/users'
import { chatPreviews, initialMessages } from '../data/chats'
import type { User } from '../types'

function profileFor(user: User): ProfileDto {
  const birth = new Date()
  birth.setUTCFullYear(birth.getUTCFullYear() - (user.age ?? 27))
  return {
    id: user.id, username: user.id, displayName: user.name, avatarUrl: user.photos[0] ?? null,
    lastSeenAt: null, age: user.age, birthDate: birth.toISOString().slice(0, 10),
    city: user.city, bio: user.bio, interests: [...user.interests], sign: user.sign,
    photos: [...user.photos], goals: [...user.goals], gender: null,
  }
}

// This client never reads a real session or makes network requests.
// Reloading the page restores all demo fixtures.
export class LocalDemoClient extends ApiClient {
  private ownProfile = profileFor(me)
  private profilesById = new Map(users.map((user) => [user.id, profileFor(user)]))
  private liked = new Set<string>()
  private conversationList: ConversationDto[] = []
  private history: Record<string, MessageDto[]> = {}
  private paymentList: PaymentDto[] = []

  constructor() {
    super({ storage: null, fetch: async () => { throw new Error('Demo network access is disabled') } })
    for (const preview of chatPreviews) {
      const conversation = this.openConversation(preview.userId)
      const messages = (initialMessages[preview.userId] ?? []).map((item, index): MessageDto => ({
        id: `demo-${preview.userId}-${item.id}`, conversationId: conversation.id,
        senderId: item.fromMe ? me.id : preview.userId, seq: index + 1, body: item.text, type: 0,
        replyToId: null, createdAt: new Date(Date.now() - (10 - index) * 60_000).toISOString(),
        editedAt: null, deletedAt: null,
      }))
      this.history[conversation.id] = messages
      this.updatePreview(conversation, messages[messages.length - 1])
      conversation.unreadCount = preview.unread
    }
    this.enter()
  }

  enter() {
    const session: AuthResponse = {
      accessToken: 'local-demo', refreshToken: 'local-demo',
      accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
      user: { ...this.ownProfile, email: 'demo@example.test' },
    }
    this.setSession(session)
  }

  private peer(id: string) {
    const profile = this.profilesById.get(id)
    if (!profile) throw new ApiError('Тестовая анкета не найдена.', 404)
    return profile
  }

  private openConversation(peerId: string) {
    const existing = this.conversationList.find((item) => item.peer.id === peerId)
    if (existing) return existing
    const conversation: ConversationDto = {
      id: `demo-${peerId}`, peer: { ...this.peer(peerId), email: `${peerId}@example.test` },
      lastMessageBody: null, lastMessageAt: null, lastMessageSenderId: null, lastSeq: 0, unreadCount: 0,
    }
    this.conversationList.push(conversation)
    this.history[conversation.id] = []
    return conversation
  }

  private conversation(id: string) {
    const conversation = this.conversationList.find((item) => item.id === id)
    if (!conversation) throw new ApiError('Тестовый диалог не найден.', 404)
    return conversation
  }

  private updatePreview(conversation: ConversationDto, message?: MessageDto) {
    if (!message) return
    Object.assign(conversation, { lastMessageBody: message.body, lastMessageAt: message.createdAt, lastMessageSenderId: message.senderId, lastSeq: message.seq })
  }

  async sendMessage(id: string, body: string, clientMessageId: string): Promise<MessageDto> {
    if (!this.getSession()) throw new ApiError('Тестовый сеанс завершён.', 401)
    const conversation = this.conversation(id)
    const existing = this.history[id].find((item) => item.id === clientMessageId)
    if (existing) return structuredClone(existing)
    const message: MessageDto = {
      id: clientMessageId, conversationId: id, senderId: me.id, seq: conversation.lastSeq + 1,
      body, type: 0, replyToId: null, createdAt: new Date().toISOString(), editedAt: null, deletedAt: null,
    }
    this.history[id].push(message)
    this.updatePreview(conversation, message)
    return structuredClone(message)
  }

  async markRead(id: string, seq: number) {
    const conversation = this.conversation(id)
    if (seq >= conversation.lastSeq) conversation.unreadCount = 0
  }

  override async request<T>(path: string, options: RequestInit = {}, authorized = true): Promise<T> {
    options.signal?.throwIfAborted()
    if (authorized && !this.getSession()) throw new ApiError('Тестовый сеанс завершён.', 401)
    const url = new URL(path, 'http://demo.invalid')
    const method = options.method ?? 'GET'
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : {}
    let result: unknown
    if (url.pathname === '/me' && method === 'GET') result = this.ownProfile
    else if (url.pathname === '/me' && method === 'PATCH') {
      const update = body as ProfileUpdate
      const birth = update.birthDate ? new Date(update.birthDate) : null
      const today = new Date()
      let age = birth ? today.getUTCFullYear() - birth.getUTCFullYear() : null
      if (birth && age !== null && (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate()))) age--
      this.ownProfile = { ...this.ownProfile, ...update, age }
      result = this.ownProfile
    }
    else if (url.pathname === '/profiles' && method === 'GET') {
      const offset = Number(url.searchParams.get('offset') ?? 0)
      result = [...this.profilesById.values()].slice(offset, offset + Number(url.searchParams.get('limit') ?? 100))
    }
    else if (url.pathname.startsWith('/profiles/') && method === 'GET') result = this.peer(decodeURIComponent(url.pathname.slice('/profiles/'.length)))
    else if (url.pathname === '/recommendations' && method === 'GET') result = users.map((user) => ({ id: `demo-${user.id}`, targetUserId: user.id, score: user.compatibility, reason: 'Тестовый пример', createdAt: new Date().toISOString() }))
    else if (url.pathname === '/likes' && method === 'GET') result = { likedUserIds: [...this.liked], incomingUserIds: users.map((user) => user.id) }
    else if (url.pathname === '/likes' && method === 'POST') {
      const conversation = this.openConversation(body.targetUserId)
      this.liked.add(body.targetUserId)
      result = { targetUserId: body.targetUserId, isMatch: true, conversationId: conversation.id }
    }
    else if (url.pathname === '/conversations' && method === 'GET') result = [...this.conversationList].sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
    else if (url.pathname === '/conversations' && method === 'POST') result = this.openConversation(body.peerId)
    else if (/^\/conversations\/[^/]+\/messages$/.test(url.pathname) && method === 'GET') {
      const id = decodeURIComponent(url.pathname.split('/')[2])
      this.conversation(id)
      const before = Number(url.searchParams.get('before') ?? Infinity)
      const all = this.history[id].filter((item) => item.seq < before)
      const items = all.slice(-50)
      const hasMore = all.length > items.length
      result = { items, hasMore, nextCursor: hasMore ? items[0].seq : null }
    }
    else if (url.pathname === '/payments' && method === 'GET') result = this.paymentList
    else if (url.pathname === '/payments' && method === 'POST') {
      const payment: PaymentDto = { id: `demo-payment-${this.paymentList.length + 1}`, userId: me.id, amount: 499, currency: 'RUB', purpose: 'Подробный расклад', status: 'pending', createdAt: new Date().toISOString(), completedAt: null }
      this.paymentList.unshift(payment)
      result = payment
    }
    else throw new ApiError('Это действие недоступно в тестовом режиме.', 400)
    return structuredClone(result) as T
  }
}
