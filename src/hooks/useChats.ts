import { useCallback, useEffect, useRef, useState } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'
import { api, hubUrl } from '../api'
import type { ConversationDto, MessageDto } from '../api/contracts'
import { errorMessage } from '../api/profiles'
import { fetchCatchup, mergeMessages } from './chatMessages'

export function useChats(userId: string) {
  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [messages, setMessages] = useState<Record<string, MessageDto[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyErrors, setHistoryErrors] = useState<Record<string, string | null>>({})
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({})
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({})
  const [connectionState, setConnectionState] = useState('connecting')
  const [typingUntil, setTypingUntil] = useState<Record<string, number>>({})
  const [readReceipts, setReadReceipts] = useState<Record<string, number>>({})
  const hub = useRef<HubConnection | null>(null)
  const messageCache = useRef<Record<string, MessageDto[]>>({})
  const alive = useRef(true)
  const listRevision = useRef(0)
  const cursors = useRef<Record<string, number | null>>({})
  const requested = useRef(new Set<string>())
  const historyRequests = useRef(new Set<string>())
  // A live event may be ahead of missed history. Only REST catchup advances this cursor.
  const syncedSeq = useRef<Record<string, number>>({})
  const pendingHistory = useRef(new Set<string>())

  const refresh = useCallback(async () => {
    const revision = ++listRevision.current
    try {
      const result = await api.conversations()
      if (alive.current && revision === listRevision.current) { setConversations(result); setError(null) }
    } catch (cause) { if (alive.current && revision === listRevision.current) setError(errorMessage(cause)) }
    finally { if (alive.current) setLoading(false) }
  }, [])

  const receive = useCallback((message: MessageDto) => {
    if (!alive.current) return
    const next = { ...messageCache.current, [message.conversationId]: mergeMessages(messageCache.current[message.conversationId] ?? [], [message]) }
    messageCache.current = next
    setMessages(next)
  }, [])

  const loadHistory = useCallback(async (id: string, older = false) => {
    const key = `${id}:${older ? 'older' : 'latest'}`
    if (historyRequests.current.has(key)) {
      if (!older) pendingHistory.current.add(id)
      return
    }
    historyRequests.current.add(key)
    requested.current.add(id)
    setHistoryLoading((current) => ({ ...current, [id]: true }))
    setHistoryErrors((current) => ({ ...current, [id]: null }))
    try {
      const knownSeq = syncedSeq.current[id] ?? 0
      const result = older ? null : await fetchCatchup((before) => api.messages(id, before), knownSeq)
      const page = result?.firstPage ?? await api.messages(id, cursors.current[id] ?? undefined)
      if (!alive.current) return
      receivePage(id, result?.items ?? page.items)
      if (!older) syncedSeq.current[id] = Math.max(knownSeq, page.items[page.items.length - 1]?.seq ?? 0)
      if (older || !(id in cursors.current)) {
        cursors.current[id] = page.nextCursor
        setHasMore((current) => ({ ...current, [id]: page.hasMore }))
      }
    } catch (cause) { if (alive.current) setHistoryErrors((current) => ({ ...current, [id]: errorMessage(cause) })) }
    finally {
      historyRequests.current.delete(key)
      if (alive.current) setHistoryLoading((current) => ({ ...current, [id]: false }))
      if (!older && pendingHistory.current.delete(id) && alive.current) void loadHistory(id)
    }
    function receivePage(conversationId: string, items: MessageDto[]) {
      const next = { ...messageCache.current, [conversationId]: mergeMessages(messageCache.current[conversationId] ?? [], items) }
      messageCache.current = next
      setMessages(next)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => api.getAccessToken() })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: (context) => Math.min(30_000, 1_000 * 2 ** Math.min(context.previousRetryCount, 5)) })
      .configureLogging(LogLevel.Warning).build()
    hub.current = connection
    connection.on('ReceiveMessage', (message: MessageDto) => { if (!disposed) { receive(message); void refresh() } })
    connection.on('UserTyping', (id: string, senderId: string) => { if (!disposed && senderId !== userId) setTypingUntil((current) => ({ ...current, [id]: Date.now() + 3000 })) })
    connection.on('ReadReceipt', (id: string, readerId: string, seq: number) => {
      if (!disposed && readerId !== userId) setReadReceipts((current) => ({ ...current, [id]: Math.max(current[id] ?? 0, seq) }))
    })
    connection.onreconnecting(() => { if (!disposed) setConnectionState('reconnecting') })
    connection.onreconnected(() => {
      if (disposed) return
      setConnectionState('connected')
      void refresh()
      requested.current.forEach((id) => { void loadHistory(id) })
    })
    connection.onclose(() => { if (!disposed) { setConnectionState('disconnected'); timer = setTimeout(start, 3000) } })
    async function start() {
      if (disposed || connection.state !== HubConnectionState.Disconnected) return
      try {
        await connection.start()
        if (disposed) { await connection.stop(); return }
        setConnectionState('connected')
        void refresh()
        requested.current.forEach((id) => { void loadHistory(id) })
      } catch {
        if (!disposed) { setConnectionState('disconnected'); timer = setTimeout(start, 3000) }
      }
    }
    void refresh()
    void start()
    const onFocus = () => {
      if (disposed || document.hidden) return
      void refresh()
      requested.current.forEach((id) => { void loadHistory(id) })
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      disposed = true; alive.current = false
      if (timer) clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      hub.current = null
      void connection.stop()
    }
  }, [userId, receive, refresh, loadHistory])

  async function sendMessage(id: string, text: string, clientMessageId: string) {
    if (hub.current?.state !== HubConnectionState.Connected) throw new Error('Связь с чатом потеряна. Дождитесь подключения и повторите отправку.')
    const message = await hub.current.invoke<MessageDto>('SendMessage', id, clientMessageId, text)
    receive(message)
    await refresh()
  }
  const markRead = useCallback(async (id: string, seq: number) => {
    if (hub.current?.state !== HubConnectionState.Connected || seq <= 0) return false
    try {
      await hub.current.invoke('MarkRead', id, seq)
      if (alive.current) setConversations((current) => current.map((item) => item.id === id && seq >= item.lastSeq ? { ...item, unreadCount: 0 } : item))
      return true
    } catch { return false }
  }, [])
  const typing = useCallback((id: string) => {
    if (hub.current?.state === HubConnectionState.Connected) void hub.current.invoke('Typing', id).catch(() => undefined)
  }, [])

  return { conversations, messages, loading, error, refresh, historyErrors, historyLoading, hasMore, loadHistory, sendMessage, markRead, typing, typingUntil, readReceipts, connectionState }
}

export type ChatsState = ReturnType<typeof useChats>
