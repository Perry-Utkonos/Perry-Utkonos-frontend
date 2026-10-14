import type { ChatPreview, Message } from '../types'

export function addMessage(messages: Record<string, Message[]>, userId: string, message: Message) {
  const conversation = messages[userId] ?? []
  // Date.now() can repeat for messages sent within the same millisecond.
  const id = Math.max(message.id, ...conversation.map((item) => item.id + 1))
  return { ...messages, [userId]: [...conversation, { ...message, id }] }
}

export function getChatPreviews(messages: Record<string, Message[]>, initial: ChatPreview[]): ChatPreview[] {
  const ids = new Set([...initial.map((chat) => chat.userId), ...Object.keys(messages)])
  return [...ids].flatMap((userId) => {
    const preview = initial.find((chat) => chat.userId === userId)
    const conversation = messages[userId] ?? []
    const last = conversation[conversation.length - 1]
    if (!last) return preview ? [preview] : []
    return [{ userId, lastMessage: last.text, time: last.time, unread: preview?.unread ?? 0 }]
  })
}
