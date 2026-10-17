import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { api } from '../api'
import type { AuthResponse, ProfileDto } from '../api/contracts'
import { errorMessage } from '../api/profiles'

interface AuthState {
  session: AuthResponse | null
  profile: ProfileDto | null
  loading: boolean
  error: string | null
  reload: () => void
  updateProfile: (profile: ProfileDto) => void
  logout: () => void
}
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore((listener) => api.subscribe(listener), () => api.getSession())
  const [profile, setProfile] = useState<ProfileDto | null>(null)
  const [loading, setLoading] = useState(Boolean(session))
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  const userId = session?.user.id
  useEffect(() => {
    let active = true
    setProfile(null)
    setError(null)
    if (!userId) { setLoading(false); return }
    setLoading(true)
    api.getMe().then((value) => { if (active) setProfile(value) }).catch((cause) => { if (active) setError(errorMessage(cause)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId, revision])

  return <AuthContext.Provider value={{ session, profile, loading, error, reload, updateProfile: (next) => { if (next.id === api.getSession()?.user.id) setProfile(next) }, logout: () => api.setSession(null) }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing')
  return value
}
