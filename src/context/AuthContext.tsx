import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  clearUserStorage,
  handleUserAuthentication,
  setActiveUserProfile,
  updateUserProfile,
  type AuthenticatedIdentity,
} from '../services/userService'
import type { UserProfile } from '../types/User'
import { apiClientConfig, clearCsrfTokenCache, csrfFetch } from '../services/apiClient'
import { AuthContext } from './authContextInstance'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Local storage is only a profile cache. The server session is authoritative.
  const [user, setUser] = useState<UserProfile | null>(null)
  const currentUser = useRef<UserProfile | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(`${apiClientConfig.baseUrl}/auth/me`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No active server session')
        const identity = (await response.json()) as AuthenticatedIdentity
        if (!identity.id || !identity.email?.trim().toLowerCase().endsWith('@iitk.ac.in')) {
          throw new Error('Server session has no verified IITK identity')
        }
        if (!cancelled && !currentUser.current) {
          const profile = handleUserAuthentication(identity)
          currentUser.current = profile
          setUser(profile)
        }
      })
      .catch(() => {
        if (!cancelled && !currentUser.current) {
          setActiveUserProfile(null)
          clearUserStorage()
          setUser(null)
        }
      })
    return () => { cancelled = true }
  }, [])

  const login = useCallback((identity: AuthenticatedIdentity): UserProfile => {
    clearCsrfTokenCache()
    const profile = handleUserAuthentication(identity)
    currentUser.current = profile
    setUser(profile)
    return profile
  }, [])

  const logout = async () => {
    try {
      const response = await csrfFetch(`${apiClientConfig.baseUrl}/auth/logout`, {
        method: 'POST',
      })
      if (response.status === 403) {
        await csrfFetch(`${apiClientConfig.baseUrl}/auth/logout`, { method: 'POST' }, true)
      }
    } catch {
      // Always clear the local profile even when the backend session expired.
    }
    clearCsrfTokenCache()
    setActiveUserProfile(null)
    clearUserStorage()
    currentUser.current = null
    setUser(null)
    // Clear both demo-identity cookies so neither a stale admin nor a stale
    // member session can bleed into the next login.
    document.cookie = 'DEMO_ADMIN_EMAIL=; path=/; max-age=0'
    document.cookie = 'DEMO_MEMBER_EMAIL=; path=/; max-age=0'
    document.cookie = 'DEMO_USER_EMAIL=; path=/; max-age=0'
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
