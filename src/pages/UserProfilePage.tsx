import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { User } from '../types'
import CompatibilityBadge from '../components/CompatibilityBadge'
import CentaurIcon from '../components/CentaurIcon'
import Avatar from '../components/Avatar'

interface UserProfilePageProps {
  user: User
  onLike: () => Promise<void>
  onSkip: () => void
  onBack: () => void
  busy?: boolean
}

export default function UserProfilePage({ user, onLike, onSkip, onBack, busy }: UserProfilePageProps) {
  const [activePhoto, setActivePhoto] = useState<number | null>(null)

  useEffect(() => {
    if (activePhoto === null) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setActivePhoto(null)
      if (event.key === 'ArrowRight') setActivePhoto((current) => current === null ? null : (current + 1) % user.photos.length)
      if (event.key === 'ArrowLeft') setActivePhoto((current) => current === null ? null : (current - 1 + user.photos.length) % user.photos.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activePhoto, user.photos.length])

  function movePhoto(direction: number) {
    setActivePhoto((current) => current === null ? null : (current + direction + user.photos.length) % user.photos.length)
  }

  return (
    <section className="page detail-page">
      <header className="page-header"><button className="icon-button" onClick={onBack} aria-label="Назад"><ArrowLeft size={20} /></button><p className="header-title">Анкета</p><span className="header-spacer" /></header>
      <div className="photo-grid">{user.photos.map((photo, i) => <button key={photo} onClick={() => setActivePhoto(i)} aria-label={`Открыть фото ${i + 1}`}>
        <Avatar
          src={photo}
          alt={`${user.name}, фото ${i + 1}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchPriority={i === 0 ? 'high' : 'low'}
          decoding="async"
        />
      </button>)}</div>
      <div className="detail-content">
        <div className="detail-title-row"><div><h1>{user.name}{user.age !== null && <span>, {user.age}</span>}</h1>{user.city && <p className="profile-location"><MapPin size={15} />{user.city}</p>}</div><Link className="compatibility-link" to={`/compatibility/${user.id}`} aria-label="Посмотреть совместимость"><CompatibilityBadge score={user.compatibility} /></Link></div>
        <section className="detail-section"><h3>Немного обо мне</h3><p>{user.bio || 'Пока не заполнено.'}</p></section>
        <section className="detail-section"><h3>Интересы</h3><div className="interest-list detail-interests">{user.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></section>
        <div className="detail-meta">
          <div><span className="meta-icon">✧</span><div><small>Знак зодиака</small><strong>{user.sign || 'Не указан'}</strong></div></div>
          <div><span className="meta-icon"><CentaurIcon monochrome /></span><div><small>Цель знакомства</small><strong>{user.goals[0] || 'Не указана'}</strong></div></div>
        </div>
      </div>
      <Link className="button button-subtle button-wide profile-reading-cta" to="/subscription">Узнать подробный расклад</Link>
      <div className="detail-actions">
        <button className="round-action action-skip" onClick={onSkip} disabled={busy} aria-label="Пропустить"><X size={22} /></button>
        <button className="round-action action-accept" onClick={() => { void onLike().catch(() => undefined) }} disabled={busy} aria-label="Нравится"><Check size={22} /></button>
      </div>
      {activePhoto !== null && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={`Фото ${activePhoto + 1} из ${user.photos.length}`} onClick={(event) => {
        if (event.target === event.currentTarget) setActivePhoto(null)
      }}>
        <button className="photo-viewer-close" onClick={() => setActivePhoto(null)} aria-label="Закрыть фото"><X size={23} /></button>
        <button className="photo-viewer-arrow previous" onClick={() => movePhoto(-1)} aria-label="Предыдущее фото"><ChevronLeft size={25} /></button>
        <Avatar className="photo-viewer-image" src={user.photos[activePhoto]} alt={`${user.name}, фото ${activePhoto + 1}`} />
        <button className="photo-viewer-arrow next" onClick={() => movePhoto(1)} aria-label="Следующее фото"><ChevronRight size={25} /></button>
        <span className="photo-viewer-count">{activePhoto + 1} / {user.photos.length}</span>
      </div>}
    </section>
  )
}
