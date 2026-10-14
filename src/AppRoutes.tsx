import { lazy } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import type { Theme } from './theme'
import { users } from './data/users'
import type { ChatPreview, Message, User } from './types'
import FeedPage from './pages/FeedPage'
import {
  loadChatPage,
  loadChatsPage,
  loadCompatibilityPage,
  loadProfilePage,
  loadSettingsPage,
  loadSubscriptionPage,
  loadUserProfilePage,
} from './routeLoaders'

const UserProfilePage = lazy(loadUserProfilePage)
const ChatsPage = lazy(loadChatsPage)
const ChatPage = lazy(loadChatPage)
const CompatibilityPage = lazy(loadCompatibilityPage)
const ProfilePage = lazy(loadProfilePage)
const SettingsPage = lazy(loadSettingsPage)
const SubscriptionPage = lazy(loadSubscriptionPage)

interface AppRoutesProps {
  match: User | null
  onCloseMatch: () => void
  feedUserId: string
  onSelectUser: (userId: string) => void
  onLike: (user: User) => void
  messages: Record<string, Message[]>
  chatPreviews: ChatPreview[]
  onSend: (userId: string, text: string) => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

export default function AppRoutes({ match, onCloseMatch, feedUserId, onSelectUser, onLike, messages, chatPreviews, onSend, theme, onThemeChange }: AppRoutesProps) {
  return (
    <Routes>
      <Route element={<AppLayout match={match} onCloseMatch={onCloseMatch} unread={chatPreviews.reduce((sum, chat) => sum + chat.unread, 0)} />}>
        <Route index element={<FeedPage users={users} selectedUserId={feedUserId} onSelectUser={onSelectUser} onLike={onLike} />} />
        <Route path="profile/:id" element={<ProfileRoute onLike={onLike} onSelectUser={onSelectUser} />} />
        <Route path="chats" element={<ChatsPage chatPreviews={chatPreviews} />} />
        <Route path="chat/:id" element={<ChatPage users={users} messages={messages} onSend={onSend} />} />
        <Route path="compatibility/:id" element={<CompatibilityRoute />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="me" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage theme={theme} onThemeChange={onThemeChange} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function ProfileRoute({ onLike, onSelectUser }: Pick<AppRoutesProps, 'onLike' | 'onSelectUser'>) {
  const navigate = useNavigate()
  const { id } = useParams()
  const currentIndex = Math.max(0, users.findIndex((profile) => profile.id === id))
  const user = users[currentIndex]
  const next = users[(currentIndex + 1) % users.length]
  function showNextInFeed() {
    onSelectUser(next.id)
    navigate('/')
  }
  return <UserProfilePage
    user={user}
    onLike={() => { onLike(user); showNextInFeed() }}
    onSkip={showNextInFeed}
    onBack={() => navigate('/')}
  />
}

function CompatibilityRoute() {
  const { id } = useParams()
  const user = users.find((profile) => profile.id === id) ?? users[0]
  return <CompatibilityPage user={user} />
}
