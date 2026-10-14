import { MessageCircle, Settings, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import CentaurIcon from './CentaurIcon'
import { loadChatsPage, loadProfilePage, loadSettingsPage } from '../routeLoaders'

const items = [
  { to: '/', label: 'Лента', Icon: CentaurIcon, end: true },
  { to: '/chats', label: 'Чаты', Icon: MessageCircle, preload: loadChatsPage },
  { to: '/me', label: 'Профиль', Icon: UserRound, end: true, preload: loadProfilePage },
  { to: '/settings', label: 'Настройки', Icon: Settings, end: true, preload: loadSettingsPage },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {items.map(({ to, label, Icon, end, preload }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onPointerEnter={() => { void preload?.() }}
          onFocus={() => { void preload?.() }}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
