import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../types'
import ProfileCard from '../components/ProfileCard'
import { loadUserProfilePage } from '../routeLoaders'

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
  onLike: (user: User) => void
}

export default function FeedPage({ users: profiles, selectedUserId, onSelectUser, onLike }: FeedPageProps) {
  const navigate = useNavigate()
  const selectedIndex = profiles.findIndex((profile) => profile.id === selectedUserId)
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0
  const activeUser = profiles[activeIndex % profiles.length]
  const nextIndex = (activeIndex + 1) % profiles.length
  const nextUser = profiles[nextIndex]

  useEffect(() => {
    preloadImage(nextUser.photos[0])
  }, [nextUser])

  const next = () => {
    onSelectUser(nextUser.id)
  }

  return (
    <section className="page feed-page">
      <header className="page-header feed-header">
        <h1>Анкеты</h1>
      </header>
      <ProfileCard
        key={activeUser.id}
        user={activeUser}
        onOpen={() => {
          onSelectUser(activeUser.id)
          navigate(`/profile/${activeUser.id}`)
        }}
        onSkip={next}
        onLike={() => {
          onLike(activeUser)
          next()
        }}
        onIntent={() => {
          void loadUserProfilePage()
          activeUser.photos.slice(1).forEach(preloadImage)
        }}
      />
    </section>
  )
}
