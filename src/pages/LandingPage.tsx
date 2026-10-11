
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LandingPage() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <section className="space-y-8 py-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
          Multi-Resource Lab Booking System
        </p>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
          Welcome, {user.name}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Manage laboratory resources, make bookings, and access the
          facilities available to you through the MRLBS platform.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            View Profile
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(user.role === 'admin' ? '/admin' : '/member')
            }
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Open Dashboard
          </button>
        </div>
      </div>

      {/* Account information */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Account
          </p>

          <p className="mt-2 break-all text-sm font-semibold text-slate-900">
            {user.email}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Role
          </p>

          <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
            {user.role}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Profile
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {user.profileCompleted ? 'Completed' : 'Not completed'}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Quick Actions
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="rounded-xl border border-slate-200 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <p className="font-semibold text-slate-900">
              Edit Profile
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Update your name, institute ID, department, bio, and profile
              picture.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(user.role === 'admin' ? '/admin' : '/member')
            }
            className="rounded-xl border border-slate-200 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <p className="font-semibold text-slate-900">
              {user.role === 'admin'
                ? 'Admin Dashboard'
                : 'Member Dashboard'}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Continue to the dashboard available for your assigned role.
            </p>
          </button>
        </div>
      </div>

      {/* Exit */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Exit
        </button>
      </div>
    </section>
  )
}