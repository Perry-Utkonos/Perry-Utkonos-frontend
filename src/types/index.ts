export interface User {
  id: string
  name: string
  age: number
  city: string
  bio: string
  interests: string[]
  sign: string
  compatibility: number
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
