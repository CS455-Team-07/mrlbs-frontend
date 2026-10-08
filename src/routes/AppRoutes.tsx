import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { AppLayout } from '../layouts/AppLayout'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/LoginPage'
import { ProfilePage } from '../pages/ProfilePage'

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<LandingPage />} />

          <Route
            path="login"
            element={
              <div className="mx-auto mt-20 max-w-xl rounded-2xl bg-white p-10 text-center shadow">
                <h1 className="text-3xl font-bold text-blue-700">
                  LOGIN ROUTE IS WORKING
                </h1>

                <p className="mt-4 text-slate-600">
                  AppRoutes is correctly loading /login.
                </p>

                <LoginPage />
              </div>
            }
          />

          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}