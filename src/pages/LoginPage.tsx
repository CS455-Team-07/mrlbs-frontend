import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ADMIN_SCOPES, getScopeForEmail } from '../config/adminConfig'
import { apiClientConfig } from '../services/apiClient'

type LoginMode = 'choose' | 'admin' | 'member'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<LoginMode>('choose')

  // Admin state
  const [adminEmail, setAdminEmail] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  // Member state
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberError, setMemberError] = useState('')

  // Already logged in → redirect
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/member'} replace />
  }

  // ── Admin login ─────────────────────────────────────────────────────────────

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setAdminError('')
    const normalized = adminEmail.trim().toLowerCase()
    const scope = getScopeForEmail(normalized)

    if (!scope) {
      setAdminError(
        'This email is not registered as an admin. Authorised admin emails are: ' +
        ADMIN_SCOPES.map((s) => s.email).join(', '),
      )
      return
    }

    setAdminLoading(true)
    try {
      // Tell the backend which admin identity this session uses
      const res = await fetch(`${apiClientConfig.baseUrl}/demo/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Backend identity switch failed')

      // Set frontend auth context
      login({ email: normalized, name: scope.name, id: `admin-${normalized}` })
      navigate('/admin', { replace: true })
    } catch {
      setAdminError('Could not complete login. Make sure the backend is running.')
    } finally {
      setAdminLoading(false)
    }
  }

  // ── Member login ─────────────────────────────────────────────────────────────

  async function handleMemberLogin(e: React.FormEvent) {
    e.preventDefault()
    setMemberError('')
    const normalizedEmail = memberEmail.trim().toLowerCase()

    if (!normalizedEmail.endsWith('@iitk.ac.in')) {
      setMemberError('Please use your IIT Kanpur email address (@iitk.ac.in).')
      return
    }
    const nameToUse = memberName.trim() || normalizedEmail.split('@')[0]

    try {
      const res = await fetch(`${apiClientConfig.baseUrl}/auth/member-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, name: nameToUse }),
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error('Failed to register member session.')
      }
      const memberData = (await res.json()) as { id: string; email: string; name: string }
      login({ email: memberData.email, name: memberData.name, id: memberData.id })
      navigate('/member', { replace: true })
    } catch {
      // Fallback to local login if backend is unreachable
      login({ email: normalizedEmail, name: nameToUse })
      navigate('/member', { replace: true })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section className="my-auto flex w-full flex-col items-center">
      {/* Page header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-blue-700 text-xl font-bold text-white shadow-lg">
          MR
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Welcome to MRLBS
        </h1>
        <p className="mt-2 text-slate-500">
          Multi-Resource Booking System · IIT Kanpur
        </p>
      </div>

      {/* Mode: choose */}
      {mode === 'choose' && (
        <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          {/* Admin card */}
          <button
            type="button"
            id="choose-admin-btn"
            onClick={() => setMode('admin')}
            className="group flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-7 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <span className="mb-4 grid size-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
              🔑
            </span>
            <span className="text-lg font-semibold text-slate-900">Admin Login</span>
            <span className="mt-1 text-sm leading-6 text-slate-500">
              For Lecture Hall, GPU, and KD Lab administrators. Manage resources for your assigned domain.
            </span>
            <span className="mt-5 text-sm font-semibold text-blue-700 group-hover:underline">
              Continue as Admin →
            </span>
          </button>

          {/* Member card */}
          <button
            type="button"
            id="choose-member-btn"
            onClick={() => setMode('member')}
            className="group flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-7 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md"
          >
            <span className="mb-4 grid size-12 place-items-center rounded-xl bg-emerald-50 text-2xl text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              🎓
            </span>
            <span className="text-lg font-semibold text-slate-900">Member Login</span>
            <span className="mt-1 text-sm leading-6 text-slate-500">
              For IIT Kanpur students and staff. Browse available resources and make bookings.
            </span>
            <span className="mt-5 text-sm font-semibold text-emerald-700 group-hover:underline">
              Continue as Member →
            </span>
          </button>
        </div>
      )}

      {/* Mode: admin */}
      {mode === 'admin' && (
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <button
              type="button"
              onClick={() => { setMode('choose'); setAdminError('') }}
              className="mb-5 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              ← Back
            </button>
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-700 text-lg text-white">🔑</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Admin Login</p>
                <h2 className="text-xl font-semibold text-slate-900">Resource Administrator</h2>
              </div>
            </div>

            {/* Admin scope badges */}
            <div className="mb-6 flex flex-wrap gap-2">
              {ADMIN_SCOPES.map((scope) => (
                <span
                  key={scope.email}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {scope.scopeLabel}
                </span>
              ))}
            </div>

            <form onSubmit={(e) => { void handleAdminLogin(e) }} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Admin email address
                <input
                  id="admin-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. lhc@iitk.ac.in"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {adminError && (
                <p id="admin-login-error" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                  {adminError}
                </p>
              )}

              <button
                id="admin-login-submit"
                type="submit"
                disabled={adminLoading}
                className="w-full rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
              >
                {adminLoading ? 'Signing in…' : 'Sign in as Admin'}
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-400">
              Only registered domain administrators can access this area. Contact your system administrator if you need access.
            </p>
          </div>
        </div>
      )}

      {/* Mode: member */}
      {mode === 'member' && (
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <button
              type="button"
              onClick={() => { setMode('choose'); setMemberError('') }}
              className="mb-5 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              ← Back
            </button>
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-lg text-white">🎓</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Member Login</p>
                <h2 className="text-xl font-semibold text-slate-900">Student / Staff</h2>
              </div>
            </div>

            <form onSubmit={handleMemberLogin} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Full name (optional)
                <input
                  id="member-name-input"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Priya Sharma"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Institutional email address
                <input
                  id="member-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="rollnumber@iitk.ac.in"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              {memberError && (
                <p id="member-login-error" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                  {memberError}
                </p>
              )}

              <button
                id="member-login-submit"
                type="submit"
                className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Sign in as Member
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-400">
              Use your @iitk.ac.in email address. Only IIT Kanpur institutional accounts are accepted.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
