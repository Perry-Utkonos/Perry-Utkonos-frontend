export interface AccountDto {
  id: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  lastSeenAt: string | null
}

export interface ProfileDto {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  lastSeenAt: string | null
  age: number | null
  birthDate: string | null
  city: string
  bio: string
  interests: string[]
  sign: string | null
  photos: string[]
  goals: string[]
  gender: string | null
}

export type ProfileUpdate = Omit<ProfileDto, 'id' | 'username' | 'lastSeenAt' | 'age'>
export interface RegisterRequest { username: string; email: string; password: string; displayName?: string }
export interface LoginRequest { usernameOrEmail: string; password: string }
export interface AuthResponse { accessToken: string; refreshToken: string; accessTokenExpiresAt: string; user: AccountDto }
export interface LikeResult { targetUserId: string; isMatch: boolean; conversationId: string | null }
export interface LikesDto { likedUserIds: string[]; incomingUserIds: string[] }
export interface ConversationDto {
  id: string
  peer: AccountDto
  lastMessageBody: string | null
  lastMessageAt: string | null
  lastMessageSenderId: string | null
  lastSeq: number
  unreadCount: number
}
export interface MessageDto {
  id: string
  conversationId: string
  senderId: string
  seq: number
  body: string | null
  type: number
  replyToId: string | null
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
}
export interface MessagePage { items: MessageDto[]; nextCursor: number | null; hasMore: boolean }
export interface RecommendationDto { id: string; targetUserId: string; score: number; reason: string; createdAt: string }
export interface PaymentDto { id: string; userId: string; amount: number; currency: string; purpose: string; status: string; createdAt: string; completedAt: string | null }
