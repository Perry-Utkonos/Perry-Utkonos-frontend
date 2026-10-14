import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { users } from '../data/users'
import type { ChatPreview } from '../types'
import CentaurIcon from '../components/CentaurIcon'

export default function ChatsPage({ chatPreviews }: { chatPreviews: ChatPreview[] }) {
  return (
    <section className="page chats-page">
      <header className="page-header chats-header"><h1>Чаты</h1><CentaurIcon monochrome className="chats-header-centaur" /></header>
      <div className="chat-list">
        {chatPreviews.map((chat) => {
          const user = users.find((candidate) => candidate.id === chat.userId)
          if (!user) return null
          return <Link className="chat-row" key={chat.userId} to={`/chat/${user.id}`}>
            <span className="chat-avatar"><img src={user.photos[0]} alt="" loading="lazy" decoding="async" />{user.online && <i />}</span>
            <span className="chat-info"><strong>{user.name}<small>{user.online ? 'В сети' : user.city}</small></strong><span>{chat.lastMessage}</span></span>
            <span className="chat-time">{chat.time}{chat.unread > 0 && <i>{chat.unread}</i>}</span>
            <ChevronRight className="chat-chevron" size={16} />
          </Link>
        })}
      </div>
    </section>
  )
}
