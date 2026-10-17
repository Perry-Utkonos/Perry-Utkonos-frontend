import { MessageCircle, Settings, UserRound } from 'lucide-react'
import TabLink from './TabLink'
import CentaurIcon from './CentaurIcon'

const items = [
  { to: '/', label: 'Лента', Icon: CentaurIcon, end: true },
  { to: '/chats', label: 'Чаты', Icon: MessageCircle },
  { to: '/me', label: 'Профиль', Icon: UserRound, end: true },
  { to: '/settings', label: 'Настройки', Icon: Settings, end: true },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {items.map(({ to, label, Icon, end }) => (
        <TabLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon />
          <span>{label}</span>
        </TabLink>
      ))}
    </nav>
  )
}
