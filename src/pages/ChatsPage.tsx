import { useEffect, useState, type FormEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import CentaurIcon from '../components/CentaurIcon'
import Avatar from '../components/Avatar'
import PageState from '../components/PageState'
import type { ChatsState } from '../hooks/useChats'
import type { User } from '../types'
import { api } from '../api'
import { errorMessage, formatTime } from '../api/profiles'

export default function ChatsPage({ chats, users }: { chats: ChatsState; users: User[] }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  useEffect(() => { void chats.refresh() }, [chats.refresh])
  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const peerId = String(new FormData(event.currentTarget).get('peer'))
    if (!peerId) return
    setStarting(true); setStartError(null)
    try { const conversation = await api.createConversation(peerId); await chats.refresh(); navigate(`/chat/${conversation.id}`) }
    catch (cause) { setStartError(errorMessage(cause)) } finally { setStarting(false) }
  }
  return <section className="page chats-page">
    <header className="page-header chats-header"><h1>Чаты</h1><CentaurIcon monochrome className="chats-header-centaur" /></header>
    {users.length > 0 && <form className="profile-form conversation-form chat-list-start" onSubmit={start}>
      <label>Начать разговор<select name="peer" required disabled={starting}><option value="">Выберите собеседника</option>{users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label>
      <button className="button button-subtle" disabled={starting}>{starting ? 'Открываем…' : 'Открыть'}</button>
    </form>}
    {startError && <p className="api-error" role="alert">{startError}</p>}
    {chats.error && <PageState title="Не удалось обновить чаты" message={chats.error} retry={() => { void chats.refresh() }} />}
    {chats.loading ? <PageState title="Загружаем чаты…" /> : chats.conversations.length === 0 && !chats.error ? <PageState title="Ваш первый разговор ещё впереди" message="Найдите знакомство в ленте или выберите собеседника выше." /> : <div className="chat-list">
      {chats.conversations.map((chat) => <Link className="chat-row" key={chat.id} to={`/chat/${chat.id}`}>
        <span className="chat-avatar"><Avatar src={chat.peer.avatarUrl} /></span>
        <span className="chat-info"><strong>{chat.peer.displayName || chat.peer.username}</strong><span>{chat.lastMessageBody || 'Начните разговор'}</span></span>
        <span className="chat-time">{formatTime(chat.lastMessageAt)}{chat.unreadCount > 0 && <i>{chat.unreadCount}</i>}</span><ChevronRight className="chat-chevron" size={16} />
      </Link>)}
    </div>}
  </section>
}
