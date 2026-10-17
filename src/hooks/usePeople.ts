import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { ProfileDto, RecommendationDto } from '../api/contracts'
import { errorMessage, toUser } from '../api/profiles'
import type { User } from '../types'

const PAGE_SIZE = 50
interface ProfilePages {
  controller: AbortController
  offset: number
  hasMore: boolean
  loadingMore: boolean
  recommendations: RecommendationDto[]
}

function toUsers(profiles: ProfileDto[], recommendations: RecommendationDto[]) {
  return profiles.map((profile) => {
    const user = toUser(profile)
    const recommendation = recommendations.find((value) => value.targetUserId === user.id)
    if (recommendation && Number.isFinite(recommendation.score)) user.compatibility = Math.round(Math.max(0, Math.min(100, recommendation.score <= 1 ? recommendation.score * 100 : recommendation.score)))
    return user
  })
}

export function usePeople(userId: string) {
  const [users, setUsers] = useState<User[]>([])
  const [liked, setLiked] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const pages = useRef<ProfilePages | null>(null)
  const reload = useCallback(() => {
    pages.current?.controller.abort()
    setLoading(true)
    setRevision((value) => value + 1)
  }, [])
  useEffect(() => {
    const batch: ProfilePages = { controller: new AbortController(), offset: 0, hasMore: false, loadingMore: false, recommendations: [] }
    pages.current = batch
    const { signal } = batch.controller
    setUsers([]); setLiked([])
    setLoading(true); setError(null); setHasMore(false); setLoadingMore(false); setLoadMoreError(null)
    Promise.all([api.profiles(signal, PAGE_SIZE, 0), api.likes(signal), api.recommendations(signal)]).then(([profiles, likes, recommendations]) => {
      if (signal.aborted || pages.current !== batch) return
      batch.offset = profiles.length
      batch.hasMore = profiles.length === PAGE_SIZE
      batch.recommendations = recommendations
      setLiked(likes.likedUserIds)
      setUsers(toUsers(profiles, recommendations))
      setHasMore(batch.hasMore)
    }).catch((cause) => { if (!signal.aborted && pages.current === batch) setError(errorMessage(cause)) }).finally(() => { if (!signal.aborted && pages.current === batch) setLoading(false) })
    return () => {
      batch.controller.abort()
      if (pages.current === batch) pages.current = null
    }
  }, [userId, revision])

  const loadMore = useCallback(async () => {
    const batch = pages.current
    if (!batch || batch.controller.signal.aborted || batch.loadingMore || !batch.hasMore) return
    batch.loadingMore = true
    setLoadingMore(true); setLoadMoreError(null)
    try {
      const profiles = await api.profiles(batch.controller.signal, PAGE_SIZE, batch.offset)
      if (batch.controller.signal.aborted || pages.current !== batch) return
      // Advance by the server page length, not the number of unique profiles:
      // newly registered accounts may shift offset pages between requests.
      batch.offset += profiles.length
      batch.hasMore = profiles.length === PAGE_SIZE
      const incoming = toUsers(profiles, batch.recommendations)
      setUsers((current) => [...new Map([...current, ...incoming].map((user) => [user.id, user])).values()])
      setHasMore(batch.hasMore)
    } catch (cause) {
      if (!batch.controller.signal.aborted && pages.current === batch) setLoadMoreError(errorMessage(cause))
    } finally {
      batch.loadingMore = false
      if (!batch.controller.signal.aborted && pages.current === batch) setLoadingMore(false)
    }
  }, [])

  return { users, liked, setLiked, loading, error, reload, loadMore, hasMore, loadingMore, loadMoreError }
}
