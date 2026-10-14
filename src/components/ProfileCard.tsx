import { useRef, useState, type PointerEvent } from 'react'
import { Check, MapPin, X } from 'lucide-react'
import type { User } from '../types'
import CompatibilityBadge from './CompatibilityBadge'

interface ProfileCardProps {
  user: User
  onOpen: () => void
  onSkip: () => void
  onLike: () => void
  onIntent: () => void
}

export default function ProfileCard({ user, onOpen, onSkip, onLike, onIntent }: ProfileCardProps) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerStart.current = { x: event.clientX, y: event.clientY }
    setIsDragging(false)
    setIsPressed(true)
    if (event.nativeEvent.isTrusted) event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointerStart.current || exitDirection) return
    const deltaX = event.clientX - pointerStart.current.x
    const deltaY = event.clientY - pointerStart.current.y
    if (!isDragging && Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setIsDragging(true)
      setIsPressed(false)
      setDragX(deltaX)
    }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!pointerStart.current) return
    const deltaX = event.clientX - pointerStart.current.x
    const deltaY = event.clientY - pointerStart.current.y
    pointerStart.current = null
    setIsPressed(false)
    if (isDragging && Math.abs(deltaX) >= 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      finishSwipe(deltaX)
      return
    }
    setIsDragging(false)
    setDragX(0)
  }

  function finishSwipe(deltaX: number) {
    const direction = deltaX > 0 ? 'right' : 'left'
    setIsDragging(false)
    setIsPressed(false)
    setExitDirection(direction)
    setDragX((direction === 'right' ? 1 : -1) * Math.max(window.innerWidth, 560))
    suppressClick.current = true
    window.setTimeout(() => {
      if (direction === 'right') onLike()
      else onSkip()
    }, 260)
  }

  return (
    <div className="profile-swipe-stage">
      <button className="swipe-action swipe-skip" onClick={onSkip} aria-label="Пропустить"><X size={25} /></button>
      <article
        className={`profile-card${isDragging ? ' is-dragging' : ''}${exitDirection ? ` is-exiting-${exitDirection}` : ''}`}
        onPointerEnter={onIntent}
        onFocusCapture={onIntent}
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX * 0.035}deg)`,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        <div
          className={`profile-card-image${isDragging ? ' is-dragging' : ''}${isPressed ? ' is-pressed' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!suppressClick.current) onOpen()
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            pointerStart.current = null
            setIsDragging(false)
            setIsPressed(false)
            setDragX(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpen()
            }
          }}
          aria-label={`Открыть анкету ${user.name}`}
        >
          <img src={user.photos[0]} alt={user.name} fetchPriority="high" decoding="async" />
          <span className="image-shade" />
          <span className="profile-hover-hint">О, как!</span>
          <div className="profile-card-info">
            <div className="feed-profile-meta">
              <CompatibilityBadge score={user.compatibility} />
              <span className="feed-zodiac">✧ {user.sign}</span>
            </div>
            <h2>{user.name}<span>, {user.age}</span></h2>
            <p className="profile-location"><MapPin size={15} />{user.city}</p>
          </div>
        </div>
      </article>
      <button className="swipe-action swipe-like" onClick={onLike} aria-label="Нравится"><Check size={25} /></button>
    </div>
  )
}
