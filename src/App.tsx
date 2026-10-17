import { useState } from 'react'
import AppRoutes from './AppRoutes'
import { useChats } from './hooks/useChats'
import { usePeople } from './hooks/usePeople'
import { useTheme } from './hooks/useTheme'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AuthPage from './pages/AuthPage'
import PageState from './components/PageState'
import { api } from './api'
import { errorMessage, toUser } from './api/profiles'
import type { User } from './types'

export default function App() {
  return <AuthProvider><Application /></AuthProvider>
}

function Application() {
  const { session, profile, loading, error, reload, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  if (!session) return <AuthPage />
  const switchingAccount = profile !== null && profile.id !== session.user.id
  if (loading || !profile || switchingAccount) return <main className="page"><PageState title={loading || switchingAccount ? 'Загружаем профиль…' : 'Не удалось загрузить профиль'} message={error} retry={error ? reload : undefined} />{error && <button className="text-button" onClick={logout}>Выйти из аккаунта</button>}</main>
  return <ConnectedApp key={profile.id} me={toUser(profile)} theme={theme} onThemeChange={setTheme} />
}

function ConnectedApp({ me, theme, onThemeChange }: { me: User; theme: 'purple' | 'cream'; onThemeChange: (theme: 'purple' | 'cream') => void }) {
  const [feedUserId, setFeedUserId] = useState('')
  const [match, setMatch] = useState<{ user: User; conversationId: string } | null>(null)
  const [liking, setLiking] = useState(false)
  const [likeError, setLikeError] = useState<string | null>(null)
  const people = usePeople(me.id)
  const chats = useChats(me.id)
  async function like(user: User) {
    setLiking(true); setLikeError(null)
    try {
      const result = await api.like(user.id)
      people.setLiked((current) => [...new Set([...current, user.id])])
      if (result.isMatch && result.conversationId) { setMatch({ user, conversationId: result.conversationId }); void chats.refresh() }
    } catch (cause) { setLikeError(errorMessage(cause)); throw cause }
    finally { setLiking(false) }
  }

  return <AppRoutes
    me={me} people={people} chats={chats}
    match={match} onCloseMatch={() => setMatch(null)} liking={liking} likeError={likeError}
    feedUserId={feedUserId} onSelectUser={setFeedUserId} onLike={like}
    theme={theme} onThemeChange={onThemeChange}
  />
}
