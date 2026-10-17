import type { ImgHTMLAttributes } from 'react'
import { avatarPlaceholder, safePhoto } from '../api/profiles'

type AvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & { src?: string | null }

export default function Avatar({ src, alt = '', decoding = 'async', ...props }: AvatarProps) {
  return <img {...props} src={safePhoto(src) || avatarPlaceholder} alt={alt} decoding={decoding} onError={(event) => { if (!event.currentTarget.src.endsWith(avatarPlaceholder)) event.currentTarget.src = avatarPlaceholder }} />
}
