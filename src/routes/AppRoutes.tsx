import { Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { AppLayout } from '../layouts/AppLayout'
import { AdminDashboard } from '../pages/AdminDashboard'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/LoginPage'
import { MemberDashboard } from '../pages/MemberDashboard'
import { NotFoundPage } from '../pages/NotFoundPage'
import { MemberHistory } from '../pages/MemberHistory'
import { ProfilePage } from '../pages/ProfilePage'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

/** Redirects to /login when the visitor is not authenticated. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Redirects to the correct dashboard when the role doesn't match the route. */
function RequireRole({ role, children }: { role: 'admin' | 'member'; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/member'} replace />
  }
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Public / Landing redirects unauthenticated users to login */}
          <Route index element={<RequireAuth><LandingPage /></RequireAuth>} />
          <Route path="login" element={<LoginPage />} />

          {/* Protected — any authenticated user */}
          <Route
            path="profile"
            element={<RequireAuth><ProfilePage /></RequireAuth>}
          />

          {/* Protected — admin only */}
          <Route
            path="admin"
            element={<RequireRole role="admin"><AdminDashboard /></RequireRole>}
          />

          {/* Protected — member only */}
          <Route
            path="member"
            element={<RequireRole role="member"><MemberDashboard /></RequireRole>}
          />
          {/* Booking History route */}
          <Route
            path="member/history"
            element={<RequireRole role="member"><MemberHistory /></RequireRole>}
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}