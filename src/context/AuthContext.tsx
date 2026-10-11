import { useCallback, useState, type ReactNode } from 'react'
import {
  getActiveUserProfile,
  handleUserAuthentication,
  setActiveUserProfile,
  updateUserProfile,
  type AuthenticatedIdentity,
} from '../services/userService'
import type { UserProfile } from '../types/User'
import { AuthContext } from './authContextInstance'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() =>
    getActiveUserProfile(),
  )

  const login = useCallback((identity: AuthenticatedIdentity): UserProfile => {
    const profile = handleUserAuthentication(identity)
    setUser(profile)
    return profile
  }, [])

  const logout = () => {
    setActiveUserProfile(null)
    setUser(null)
  }

  const updateProfile = (
    updates: Partial<Pick<UserProfile, 'name' | 'avatarUrl' | 'institutionalId' | 'department' | 'bio' | 'profileCompleted'>>,
  ): UserProfile | null => {
    if (!user) return null
    const updated = updateUserProfile(user.email, updates)
    if (updated) setUser(updated)
    return updated
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
