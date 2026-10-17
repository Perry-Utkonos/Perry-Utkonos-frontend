import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Send, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import PageState from '../components/PageState'
import type { ChatsState } from '../hooks/useChats'
import type { User } from '../types'
import { createMessageId } from '../hooks/chatMessages'
import { errorMessage, formatTime } from '../api/profiles'

export default function ChatPage({ me, chats }: { me: User; chats: ChatsState }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clock, setClock] = useState(Date.now())
  const [visible, setVisible] = useState(!document.hidden)
  const container = useRef<HTMLDivElement>(null)
  const attempt = useRef<{ id: string; text: string; conversation: string } | null>(null)
  const typingSentAt = useRef(0)
  const readUpTo = useRef<Record<string, number>>({})
  const conversation = chats.conversations.find((item) => item.id === id)
  const messages = chats.messages[id] ?? []
  const latestSeq = messages[messages.length - 1]?.seq ?? 0

  useEffect(() => { void chats.loadHistory(id); setText(''); setError(null); attempt.current = null }, [id, chats.loadHistory])
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000)
    function change() { setVisible(!document.hidden) }
    document.addEventListener('visibilitychange', change)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', change) }
  }, [])
  useEffect(() => {
    if (!visible || latestSeq <= (readUpTo.current[id] ?? 0) || chats.connectionState !== 'connected') return
    void chats.markRead(id, latestSeq).then((success) => { if (success) readUpTo.current[id] = latestSeq })
  }, [id, latestSeq, visible, chats.connectionState, chats.markRead])
  useEffect(() => {
    const target = container.current
    if (target) target.scrollTop = target.scrollHeight
  }, [id, latestSeq])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    if (!attempt.current || attempt.current.text !== body || attempt.current.conversation !== id) attempt.current = { id: createMessageId(), text: body, conversation: id }
    setSending(true); setError(null)
    try { await chats.sendMessage(id, body, attempt.current.id); setText(''); attempt.current = null }
    catch (cause) { setError(errorMessage(cause)) } finally { setSending(false) }
  }
  if (!conversation) return <section className="page chat-page"><button className="text-button" onClick={() => navigate('/chats')}>К чатам</button><PageState title={chats.loading ? 'Загружаем диалог…' : 'Диалог недоступен'} message={chats.error || 'Откройте переписку из списка чатов.'} retry={chats.error ? () => { void chats.refresh() } : undefined} /></section>
  const peer = conversation.peer
  return <section className="page chat-page">
    <header className="chat-header"><button className="icon-button" onClick={() => navigate('/chats')} aria-label="К чатам"><ArrowLeft size={20} /></button><Avatar src={peer.avatarUrl} /><div><strong>{peer.displayName || peer.username}</strong><small>{chats.connectionState === 'connected' ? 'Чат подключён' : 'Подключаемся…'}</small></div><Link to={`/compatibility/${peer.id}`} className="chat-compat" aria-label="Посмотреть совместимость"><Sparkles size={18} /><span>Совместимость</span></Link></header>
    {chats.connectionState !== 'connected' && <p className="chat-status" role="status">Связь потеряна. Восстанавливаем подключение…</p>}
    <div className="messages" ref={container} aria-live="polite" aria-label="Сообщения">
      {chats.hasMore[id] && <button className="button button-subtle load-history" disabled={chats.historyLoading[id]} onClick={async () => {
        const previousHeight = container.current?.scrollHeight ?? 0
        await chats.loadHistory(id, true)
        requestAnimationFrame(() => { if (container.current) container.current.scrollTop = container.current.scrollHeight - previousHeight })
      }}>Показать предыдущие</button>}
      {chats.historyErrors[id] && <PageState title="Не удалось загрузить сообщения" message={chats.historyErrors[id]} retry={() => { void chats.loadHistory(id) }} />}
      {!messages.length && (chats.historyLoading[id] ? <PageState title="Загружаем сообщения…" /> : !chats.historyErrors[id] && <PageState title="Начните разговор" message="Напишите первое сообщение." />)}
      {messages.map((message, index) => {
        const mine = message.senderId === me.id
        const showDate = index === 0 || messages[index - 1].createdAt.slice(0, 10) !== message.createdAt.slice(0, 10)
        return <div key={message.id} style={{ display: 'contents' }}>{showDate && <div className="message-day">{new Date(message.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>}<div className={`message ${mine ? 'mine' : 'theirs'}`}>
          {!mine && <Avatar src={peer.avatarUrl} />}<div className="message-bubble">{message.deletedAt ? 'Сообщение удалено' : message.body || 'Вложение'}<time dateTime={message.createdAt}>{formatTime(message.createdAt)}{mine && <span className="read-check" aria-label={message.seq <= (chats.readReceipts[id] ?? 0) ? 'Прочитано' : 'Отправлено'}>{message.seq <= (chats.readReceipts[id] ?? 0) ? ' ✓✓' : ' ✓'}</span>}</time></div>
        </div></div>
      })}
    </div>
    <div className="typing-hint" role="status">{(chats.typingUntil[id] ?? 0) > clock ? 'Собеседник печатает…' : ''}</div>
    {error && <p className="api-error chat-error" role="alert">{error} Текст сохранён — повторите отправку.</p>}
    <form className="message-composer" onSubmit={submit}><input value={text} disabled={sending} onChange={(event) => {
      setText(event.target.value)
      if (Date.now() - typingSentAt.current > 1500) { chats.typing(id); typingSentAt.current = Date.now() }
    }} placeholder="Написать сообщение…" aria-label="Сообщение" maxLength={8000} /><button type="submit" aria-label={sending ? 'Отправляем сообщение' : 'Отправить сообщение'} disabled={!text.trim() || sending || chats.connectionState !== 'connected'}><Send size={18} /></button></form>
  </section>
}
