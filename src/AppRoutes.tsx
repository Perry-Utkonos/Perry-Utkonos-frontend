import { lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import type { Theme } from './theme'
import type { User } from './types'
import type { ChatsState } from './hooks/useChats'
import type { usePeople } from './hooks/usePeople'
import FeedPage from './pages/FeedPage'
import ChatsPage from './pages/ChatsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import PageState from './components/PageState'
import { api } from './api'
import { errorMessage, toUser } from './api/profiles'
import { loadChatPage, loadCompatibilityPage, loadSubscriptionPage, loadUserProfilePage } from './routeLoaders'

const UserProfilePage = lazy(loadUserProfilePage)
const ChatPage = lazy(loadChatPage)
const CompatibilityPage = lazy(loadCompatibilityPage)
const SubscriptionPage = lazy(loadSubscriptionPage)

interface AppRoutesProps {
  me: User
  people: ReturnType<typeof usePeople>
  chats: ChatsState
  match: { user: User; conversationId: string } | null
  onCloseMatch: () => void
  feedUserId: string
  onSelectUser: (userId: string) => void
  onLike: (user: User) => Promise<void>
  liking: boolean
  likeError: string | null
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

export default function AppRoutes(props: AppRoutesProps) {
  const { me, people, chats, match, onCloseMatch, feedUserId, onSelectUser, onLike, liking, likeError, theme, onThemeChange } = props
  return <Routes>
    <Route element={<AppLayout me={me} match={match} onCloseMatch={onCloseMatch} unread={chats.conversations.reduce((sum, chat) => sum + chat.unreadCount, 0)} />}>
      <Route index element={people.loading ? <section className="page"><PageState title="Загружаем анкеты…" /></section> : people.error ? <section className="page"><PageState title="Не удалось загрузить анкеты" message={people.error} retry={people.reload} /></section> : <>
        {likeError && <p className="api-error" role="alert">{likeError}</p>}
        <FeedPage users={people.users.filter((user) => !people.liked.includes(user.id))} selectedUserId={feedUserId} onSelectUser={onSelectUser} onLike={onLike} busy={liking} onRefresh={people.reload} profileIncomplete={!me.bio || me.age === null} hasMore={people.hasMore} loadingMore={people.loadingMore} loadMoreError={people.loadMoreError} onLoadMore={people.loadMore} />
      </>} />
      <Route path="profile/:id" element={<ProfileRoute {...props} />} />
      <Route path="chats" element={<ChatsPage chats={chats} users={people.users} />} />
      <Route path="chat/:id" element={<ConversationRoute me={me} chats={chats} />} />
      <Route path="compatibility/:id" element={<ProfileLoader users={people.users}>{(user) => <CompatibilityPage user={user} me={me} />}</ProfileLoader>} />
      <Route path="subscription" element={<SubscriptionPage />} />
      <Route path="me" element={<ProfilePage />} />
      <Route path="settings" element={<SettingsPage theme={theme} onThemeChange={onThemeChange} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
}

function ProfileRoute({ people, onLike, onSelectUser, liking, likeError }: AppRoutesProps) {
  const navigate = useNavigate()
  const { id } = useParams()
  function next() {
    const available = people.users.filter((user) => !people.liked.includes(user.id) && user.id !== id)
    onSelectUser(available[0]?.id ?? '')
    navigate('/')
  }
  return <ProfileLoader users={people.users}>{(user) => <>
    {likeError && <p className="api-error" role="alert">{likeError}</p>}
    <UserProfilePage key={user.id} user={user} busy={liking} onLike={async () => { await onLike(user); next() }} onSkip={next} onBack={() => navigate('/')} />
  </>}</ProfileLoader>
}

function ConversationRoute({ me, chats }: { me: User; chats: ChatsState }) {
  const { id } = useParams()
  return <ChatPage key={id} me={me} chats={chats} />
}

function ProfileLoader({ users, children }: { users: User[]; children: (user: User) => React.ReactNode }) {
  const { id = '' } = useParams()
  const cached = users.find((user) => user.id === id)
  const [loaded, setLoaded] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setLoaded(null); setError(null)
    api.profile(id).then((profile) => { if (active) setLoaded({ ...toUser(profile), compatibility: cached?.compatibility ?? null }) }).catch((cause) => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [id, cached, revision])
  const user = (loaded?.id === id ? loaded : null) || cached
  if (!user) return <section className="page"><PageState title={error ? 'Анкета недоступна' : 'Загружаем анкету…'} message={error} retry={error ? () => setRevision((value) => value + 1) : undefined} /></section>
  return children(user)
}
