import type { AccountDto, ProfileDto } from './contracts'
import type { User } from '../types'

export const avatarPlaceholder = '/images/avatar-placeholder.svg'
export function safePhoto(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? value : null } catch { return null }
}
export function toUser(profile: ProfileDto | AccountDto): User {
  const full = 'interests' in profile ? profile : null
  const photos = [...(full?.photos ?? []), profile.avatarUrl].map(safePhoto).filter((value): value is string => value !== null)
  return {
    id: profile.id, name: profile.displayName || profile.username, username: profile.username,
    age: full?.age ?? null, city: full?.city || '', bio: full?.bio || '', interests: full?.interests || [],
    sign: full?.sign || '', compatibility: null, photos: photos.length ? [...new Set(photos)] : [avatarPlaceholder],
    goals: full?.goals || [],
  }
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Не удалось выполнить действие. Повторите попытку.' }
