import { createContext } from 'react'
import type { AuthenticatedIdentity } from '../services/userService'
import type { UserProfile, UserRole } from '../types/User'

export interface AuthContextType {
  user: UserProfile | null
  role: UserRole | null
  isAuthenticated: boolean
  login: (identity: AuthenticatedIdentity) => UserProfile
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Pick<UserProfile, 'name' | 'avatarUrl' | 'institutionalId' | 'department' | 'bio' | 'profileCompleted'>>) => UserProfile | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
