import { useState } from 'react'
import type { User } from '../types'

export function useLikes() {
  const [match, setMatch] = useState<User | null>(null)
  return { match, like: setMatch, closeMatch: () => setMatch(null) }
}
