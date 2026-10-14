import { Suspense } from 'react'
import { MessageCircle, Settings, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import CentaurIcon from '../components/CentaurIcon'
import MatchModal from '../components/MatchModal'
import { loadChatsPage, loadProfilePage, loadSettingsPage } from '../routeLoaders'
import type { User } from '../types'

const nav = [
  { to: '/', label: 'Лента', Icon: CentaurIcon, end: true },
  { to: '/chats', label: 'Сообщения', Icon: MessageCircle, preload: loadChatsPage },
  { to: '/me', label: 'Мой профиль', Icon: UserRound, end: true, preload: loadProfilePage },
]

interface AppLayoutProps {
  match: User | null
  onCloseMatch: () => void
  unread: number
}

export default function AppLayout({ match, onCloseMatch, unread }: AppLayoutProps) {
  const navigate = useNavigate()
  return (
    <div className="app-frame">
      <aside className="desktop-sidebar">
        <Link to="/" className="brand"><span className="brand-mark"><CentaurIcon monochrome /></span>fate<span className="brand-dot">.</span></Link>
        <nav>{nav.map(({ to, label, Icon, end, preload }) => <NavLink
          key={to} to={to} end={end}
          className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}
          onPointerEnter={() => { void preload?.() }}
          onFocus={() => { void preload?.() }}
        ><Icon /><span>{label}</span>{to === '/chats' && unread > 0 && <i>{unread}</i>}</NavLink>)}</nav>
        <NavLink to="/settings" end className={({ isActive }) => `side-link settings-side-link${isActive ? ' active' : ''}`} onPointerEnter={() => { void loadSettingsPage() }} onFocus={() => { void loadSettingsPage() }}><Settings size={19} /><span>Настройки</span></NavLink>
      </aside>
      <main className="app-main">
        <Suspense fallback={<div className="route-loading" role="status">Загрузка…</div>}><Outlet /></Suspense>
      </main>
      <BottomNav />
      {match && <MatchModal user={match} onClose={onCloseMatch} onContinue={() => {
        onCloseMatch()
        navigate('/')
      }} />}
    </div>
  )
}
