import { useCallback, useState, type ReactNode } from 'react'
import {
  getActiveUserProfile,
  handleUserAuthentication,
  setActiveUserProfile,
  updateUserProfile,
  type AuthenticatedIdentity,
} from '../services/userService'
import type { UserProfile } from '../types/User'
import { authenticationEnabled, demoProfile } from '../config/authConfig'
import { AuthContext } from './authContextInstance'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() =>
    authenticationEnabled ? getActiveUserProfile() : { ...demoProfile },
  )

  const login = useCallback((identity: AuthenticatedIdentity): UserProfile => {
    const profile = handleUserAuthentication(identity)
    setUser(profile)
    return profile
  }, [])

  const logout = () => {
    if (!authenticationEnabled) return
    setActiveUserProfile(null)
    setUser(null)
  }

  const updateProfile = (
    updates: Partial<Pick<UserProfile, 'name' | 'avatarUrl' | 'institutionalId' | 'department' | 'bio' | 'profileCompleted'>>,
  ): UserProfile | null => {
    if (!user) return null
    if (!authenticationEnabled) {
      const updated = { ...user, ...updates }
      setUser(updated)
      return updated
    }
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
