import { useState } from 'react'
import AppRoutes from './AppRoutes'
import { users } from './data/users'
import { useChats } from './hooks/useChats'
import { useLikes } from './hooks/useLikes'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const [feedUserId, setFeedUserId] = useState(users[0].id)
  const { match, like, closeMatch } = useLikes()
  const { messages, chatPreviews, sendMessage } = useChats()
  const { theme, setTheme } = useTheme()

  return <AppRoutes
    match={match} onCloseMatch={closeMatch}
    feedUserId={feedUserId} onSelectUser={setFeedUserId} onLike={like}
    messages={messages} chatPreviews={chatPreviews} onSend={sendMessage}
    theme={theme} onThemeChange={setTheme}
  />
}
