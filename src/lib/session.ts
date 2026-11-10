// Utilisateur connecté et parieur associé, partagés dans toute l'application
import { createContext, useContext } from 'react'
import type { Person } from '@/types/betting'

export interface SessionInfo { userId: string; email?: string; person: Person | null }
export const SessionContext = createContext<SessionInfo>({ userId: '', person: null })
export const useSession = () => useContext(SessionContext)
