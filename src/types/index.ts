export interface User {
  id: string
  name: string
  username?: string
  age: number | null
  city: string
  bio: string
  interests: string[]
  sign: string
  compatibility: number | null
  photos: string[]
  goals: string[]
  online?: boolean
}

export interface Message {
  id: number
  text: string
  fromMe: boolean
  time: string
}

export interface ChatPreview {
  userId: string
  lastMessage: string
  time: string
  unread: number
}
