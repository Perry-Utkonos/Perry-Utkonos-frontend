import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import type { User } from '../types'
import ProfileCard from '../components/ProfileCard'
import { loadUserProfilePage } from '../routeLoaders'
import PageState from '../components/PageState'

const preloadedImages = new Set<string>()

function preloadImage(src: string) {
  if (preloadedImages.has(src)) return
  preloadedImages.add(src)
  const image = new Image()
  image.src = src
}

interface FeedPageProps {
  users: User[]
  selectedUserId: string
  onSelectUser: (userId: string) => void
  onLike: (user: User) => Promise<void>
  busy?: boolean
  onRefresh?: () => void
  profileIncomplete?: boolean
  hasMore?: boolean
  loadingMore?: boolean
  loadMoreError?: string | null
  onLoadMore?: () => Promise<void>
}

export default function FeedPage({ users: profiles, selectedUserId, onSelectUser, onLike, busy, onRefresh, profileIncomplete, hasMore, loadingMore, loadMoreError, onLoadMore }: FeedPageProps) {
  const navigate = useNavigate()
  const selectedIndex = profiles.findIndex((profile) => profile.id === selectedUserId)
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0
  const activeUser = profiles[activeIndex]
  const nextIndex = profiles.length ? (activeIndex + 1) % profiles.length : 0
  const nextUser = profiles[nextIndex]

  useEffect(() => {
    if (nextUser) preloadImage(nextUser.photos[0])
  }, [nextUser])

  const next = () => {
    if (nextUser) onSelectUser(nextUser.id)
  }

  return (
    <section className="page feed-page">
      <header className="page-header feed-header">
        <h1>Анкеты</h1>
        <button className="icon-button" onClick={onRefresh} disabled={busy} aria-label="Обновить анкеты"><RefreshCw size={18} /></button>
      </header>
      {profileIncomplete && <p className="api-notice feed-onboarding"><Link to="/me">Заполните свою анкету — расскажите о себе и добавьте фотографию.</Link></p>}
      {!activeUser ? <PageState title={hasMore ? 'В этой подборке больше нет анкет' : 'Вы посмотрели все анкеты'} message={hasMore ? 'Загрузите следующую подборку, чтобы продолжить знакомство.' : 'Новые знакомства появятся здесь, когда зарегистрируются другие участники.'} /> : <ProfileCard
        key={activeUser.id}
        user={activeUser}
        onOpen={() => {
          onSelectUser(activeUser.id)
          navigate(`/profile/${activeUser.id}`)
        }}
        onSkip={next}
        disabled={busy}
        onLike={async () => {
          await onLike(activeUser)
          next()
        }}
        onIntent={() => {
          void loadUserProfilePage()
          activeUser.photos.slice(1).forEach(preloadImage)
        }}
      />}
      {loadMoreError && <p className="api-error" role="alert">{loadMoreError}</p>}
      {hasMore && <button className="button button-subtle button-wide" disabled={busy || loadingMore} onClick={() => { void onLoadMore?.() }}>{loadingMore ? 'Загружаем анкеты…' : loadMoreError ? 'Повторить загрузку' : 'Показать ещё анкеты'}</button>}
    </section>
  )
}
