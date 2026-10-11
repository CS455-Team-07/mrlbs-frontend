import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { AppLayout } from '../layouts/AppLayout'
import { AdminDashboard } from '../pages/AdminDashboard'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/LoginPage'
import { MemberDashboard } from '../pages/MemberDashboard'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProfilePage } from '../pages/ProfilePage'

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<LandingPage />} />

          <Route path="login" element={<LoginPage />} />

          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="member" element={<MemberDashboard />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}