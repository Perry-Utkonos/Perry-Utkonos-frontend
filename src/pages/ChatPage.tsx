import { useState, type FormEvent } from 'react'
import { ArrowLeft, Send, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Message, User } from '../types'

interface ChatPageProps {
  users: User[]
  messages: Record<string, Message[]>
  onSend: (userId: string, text: string) => void
}

export default function ChatPage({ users, messages, onSend }: ChatPageProps) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const user = users.find((profile) => profile.id === id) ?? users[0]
  const [text, setText] = useState('')
  const conversation = messages[user.id] ?? []

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim()) return
    onSend(user.id, text.trim())
    setText('')
  }

  return (
    <section className="page chat-page">
      <header className="chat-header">
        <button className="icon-button" onClick={() => navigate('/chats')} aria-label="К чатам"><ArrowLeft size={20} /></button>
        <img src={user.photos[0]} alt="" fetchPriority="high" decoding="async" />
        <div><strong>{user.name}</strong><small>{user.online ? 'В сети' : 'Ваше совпадение'}</small></div>
        <Link to={`/compatibility/${user.id}`} className="chat-compat" aria-label="Посмотреть совместимость"><Sparkles size={18} /><span>Совместимость</span></Link>
      </header>
      <div className="message-day">СЕГОДНЯ</div>
      <div className="messages">
        {conversation.map((message) => <div key={message.id} className={`message ${message.fromMe ? 'mine' : 'theirs'}`}>
          {!message.fromMe && <img src={user.photos[0]} alt="" loading="lazy" decoding="async" />}
          <div className="message-bubble">{message.text}<time>{message.time}</time></div>
        </div>)}
      </div>
      <form className="message-composer" onSubmit={submit}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Написать сообщение..." aria-label="Сообщение" />
        <button type="submit" aria-label="Отправить сообщение" disabled={!text.trim()}><Send size={18} /></button>
      </form>
    </section>
  )
}
