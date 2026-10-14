import { useState } from 'react'
import { chatPreviews as initialPreviews, initialMessages } from '../data/chats'
import { addMessage, getChatPreviews } from '../data/chatState'

export function useChats() {
  const [messages, setMessages] = useState(initialMessages)
  const chatPreviews = getChatPreviews(messages, initialPreviews)

  function sendMessage(userId: string, text: string) {
    if (!text.trim()) return
    const message = {
      id: Date.now(),
      text: text.trim(),
      fromMe: true,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((current) => addMessage(current, userId, message))
  }

  return { messages, chatPreviews, sendMessage }
}
