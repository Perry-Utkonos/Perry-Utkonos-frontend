import { MessageCircle, Settings, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import TabLink from '../components/TabLink'
import RouteTransition from '../components/RouteTransition'
import BottomNav from '../components/BottomNav'
import CentaurIcon from '../components/CentaurIcon'
import MatchModal from '../components/MatchModal'
import type { User } from '../types'
import { demo } from '../api'

const nav = [
  { to: '/', label: 'Лента', Icon: CentaurIcon, end: true },
  { to: '/chats', label: 'Сообщения', Icon: MessageCircle },
  { to: '/me', label: 'Мой профиль', Icon: UserRound, end: true },
]

interface AppLayoutProps {
  match: { user: User; conversationId: string } | null
  me: User
  onCloseMatch: () => void
  unread: number
}

export default function AppLayout({ match, me, onCloseMatch, unread }: AppLayoutProps) {
  const navigate = useNavigate()
  return (
    <div className="app-frame">
      <aside className="desktop-sidebar">
        <Link to="/" className="brand"><span className="brand-mark"><CentaurIcon monochrome /></span>fate<span className="brand-dot">.</span></Link>
        <nav>{nav.map(({ to, label, Icon, end }) => <TabLink
          key={to} to={to} end={end}
          className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}
        ><Icon /><span>{label}</span>{to === '/chats' && unread > 0 && <i>{unread}</i>}</TabLink>)}</nav>
        <TabLink to="/settings" end className={({ isActive }) => `side-link settings-side-link${isActive ? ' active' : ''}`}><Settings size={19} /><span>Настройки</span></TabLink>
      </aside>
      <main className="app-main">
        {demo && <div className="demo-notice" role="status"><span>Тестовый режим · данные примеров</span><button className="text-button" onClick={() => window.location.reload()}>Сбросить</button></div>}
        <RouteTransition />
      </main>
      <BottomNav />
      {match && <MatchModal user={match.user} me={me} conversationId={match.conversationId} onClose={onCloseMatch} onContinue={() => {
        onCloseMatch()
        navigate('/')
      }} />}
    </div>
  )
}
