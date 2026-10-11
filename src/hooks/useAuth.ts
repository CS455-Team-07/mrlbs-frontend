import { useContext } from 'react'
import { AuthContext } from '../context/authContextInstance'

/**
 * Custom hook to access current authentication state, user profile, and assigned role for RBAC enforcement.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
