import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiClientConfig } from '../services/apiClient'
import { ADMIN_SCOPES } from '../config/adminConfig'

interface AuthenticatedUser {
  id: string
  name: string
  email: string
  role?: string
}

interface MessageResponse {
  message?: string
}

type LoginRole = 'member' | 'admin'

export function LoginPage() {
  const { user, login } = useAuth()
  const [selectedRole, setSelectedRole] = useState<LoginRole>('member')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/member'} replace />
  }

  function handleRoleChange(newRole: LoginRole) {
    setSelectedRole(newRole)
    setCodeSent(false)
    setCode('')
    setError('')
    setNotice('')
    if (newRole === 'admin' && !email) {
      setEmail('lhc@iitk.ac.in')
    } else if (newRole === 'member' && (email === 'lhc@iitk.ac.in' || email === 'gpus@iitk.ac.in' || email === 'kdlab@iitk.ac.in')) {
      setEmail('')
    }
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail.endsWith('@iitk.ac.in')) {
      setError('Only @iitk.ac.in email addresses are accepted.')
      setBusy(false)
      return
    }

    if (selectedRole === 'admin') {
      const isKnownAdmin = ADMIN_SCOPES.some((s) => s.email === trimmedEmail)
      if (!isKnownAdmin) {
        setError(`"${trimmedEmail}" is not a recognised administrator email. Please select an authorized admin account or switch to Member login.`)
        setBusy(false)
        return
      }
    }

    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: trimmedEmail, role: selectedRole }),
      })
      const rawText = await response.text()
      let result: { status?: string; message?: string; id?: string; name?: string; email?: string; role?: string } = {}
      try {
        result = JSON.parse(rawText)
      } catch {
        result = { message: rawText || 'Server returned an invalid response.' }
      }

      if (!response.ok) {
        throw new Error(result.message || 'Could not complete login request.')
      }

      if (result.status === 'LOGGED_IN') {
        // Direct login succeeded (admin or returning member)
        login({
          id: result.id || `user_${Date.now()}`,
          name: result.name || trimmedEmail.split('@')[0],
          email: result.email || trimmedEmail,
        })
      } else if (result.status === 'OTP_REQUIRED') {
        // First-time member requires OTP
        setCodeSent(true)
        setNotice(result.message || `A verification code has been sent to ${trimmedEmail}.`)
      }
    } catch (requestError) {
      if (requestError instanceof TypeError && requestError.message.includes('fetch')) {
        setError('Could not reach the sign-in service. Please try again.')
      } else {
        setError(requestError instanceof Error ? requestError.message : 'Could not complete sign in.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const trimmedEmail = email.trim().toLowerCase()

    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: trimmedEmail, code: code.trim() }),
      })
      const rawText = await response.text()
      let result: (AuthenticatedUser & MessageResponse) | null = null
      try {
        result = JSON.parse(rawText) as AuthenticatedUser & MessageResponse
      } catch {
        throw new Error(rawText || 'Could not verify code.')
      }
      if (!response.ok) throw new Error(result?.message || 'Could not verify the code.')
      if (!result?.email || !result?.id) {
        throw new Error('The institutional account could not be verified.')
      }
      login(result)
    } catch (verifyError) {
      if (verifyError instanceof TypeError && verifyError.message.includes('fetch')) {
        setError('Could not reach the sign-in service. Please try again.')
      } else {
        setError(verifyError instanceof Error ? verifyError.message : 'Could not verify the code.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="my-auto flex w-full flex-col items-center">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-blue-700 text-xl font-bold text-white shadow-lg">
            MR
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Sign in to MRLBS</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Multi-Resource Booking System · IIT Kanpur
          </p>
        </div>

        {/* Role Switcher Tabs */}
        {!codeSent && (
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => handleRoleChange('member')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                selectedRole === 'member'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👤</span>
              <span>Login as Member</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                selectedRole === 'admin'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🛡️</span>
              <span>Login as Admin</span>
            </button>
          </div>
        )}

        {/* Informational banner based on role */}
        {!codeSent && (
          <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600">
            {selectedRole === 'member' ? (
              <p>
                <strong>Member Sign In:</strong> Enter your IIT Kanpur student or faculty email address to sign in.
              </p>
            ) : (
              <div>
                <p className="mb-2">
                  <strong>Administrator Sign In:</strong> Select an authorized admin account or enter your admin email.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ADMIN_SCOPES.map((admin) => (
                    <button
                      key={admin.email}
                      type="button"
                      onClick={() => setEmail(admin.email)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                        email === admin.email
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {admin.name} ({admin.email})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">
            {notice}
          </div>
        )}

        {!codeSent ? (
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="institutional-email">
                {selectedRole === 'admin' ? 'Admin email address' : 'IITK member email address'}
              </label>
              <input
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                id="institutional-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder={selectedRole === 'admin' ? 'lhc@iitk.ac.in' : 'username@iitk.ac.in'}
                required
                type="email"
                value={email}
              />
            </div>
            <button
              className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy
                ? 'Signing in…'
                : selectedRole === 'admin'
                  ? 'Sign in as Administrator'
                  : 'Continue to Sign In'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={verifyCode}>
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
              Logging in as <strong>{selectedRole.toUpperCase()}</strong> ({email})
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="verification-code">
                Enter 6-digit verification code
              </label>
              <input
                autoComplete="one-time-code"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-bold tracking-[0.4em] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                id="verification-code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="······"
                required
                value={code}
              />
            </div>
            <button
              className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
              disabled={busy || code.length !== 6}
              type="submit"
            >
              {busy ? 'Verifying…' : 'Verify and sign in'}
            </button>
            <button
              className="w-full text-center text-sm font-medium text-blue-700 hover:text-blue-900"
              disabled={busy}
              onClick={() => {
                setCodeSent(false)
                setCode('')
                setNotice('')
                setError('')
              }}
              type="button"
            >
              ← Back to change email address
            </button>
          </form>
        )}

        <p className="mt-6 text-center">
          <Link to="/" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
            Return to home
          </Link>
        </p>
      </div>
    </section>
  )
}
