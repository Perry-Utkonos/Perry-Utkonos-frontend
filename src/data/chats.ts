import type { ChatPreview, Message } from '../types'

export const chatPreviews: ChatPreview[] = [
  { userId: 'mila', lastMessage: 'Тогда до встречи в субботу ☕', time: '12:42', unread: 2 },
  { userId: 'leo', lastMessage: 'Отправил тебе тот плейлист!', time: 'Вчера', unread: 0 },
  { userId: 'anya', lastMessage: 'Это было очень красиво ✨', time: 'Вт', unread: 0 },
]

export const initialMessages: Record<string, Message[]> = {
  mila: [
    { id: 1, text: 'Привет! У тебя в профиле тоже написано про маленькие кофейни :)', fromMe: false, time: '12:31' },
    { id: 2, text: 'Значит, пора обменяться любимыми местами', fromMe: true, time: '12:35' },
    { id: 3, text: 'Тогда до встречи в субботу ☕', fromMe: false, time: '12:42' },
  ],
  leo: [
    { id: 1, text: 'Отправил тебе тот плейлист!', fromMe: false, time: 'Вчера' },
    { id: 2, text: 'Уже слушаю. Идеальный саундтрек для прогулки', fromMe: true, time: 'Вчера' },
  ],
  anya: [
    { id: 1, text: 'Спасибо за прогулку, давно так не смеялась', fromMe: false, time: 'Вт' },
    { id: 2, text: 'Это было очень красиво ✨', fromMe: false, time: 'Вт' },
  ],
}
