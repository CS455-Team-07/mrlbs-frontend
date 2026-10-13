import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiClientConfig, csrfFetch } from '../services/apiClient'

interface AuthenticatedUser {
  id: string
  name: string
  email: string
}

interface MessageResponse {
  message?: string
}

export function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/member'} replace />
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await csrfFetch(`${apiClientConfig.baseUrl}/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = (await response.json()) as MessageResponse
      if (!response.ok) throw new Error(result.message ?? 'Could not send a verification code.')
      setCodeSent(true)
      setNotice(result.message ?? 'Check your institutional inbox for the verification code.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send a verification code.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await csrfFetch(`${apiClientConfig.baseUrl}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const result = (await response.json()) as AuthenticatedUser & MessageResponse
      if (!response.ok) throw new Error(result.message ?? 'Could not verify the code.')
      if (!result.email || !result.id || !result.email.toLowerCase().endsWith('@iitk.ac.in')) {
        throw new Error('The institutional account could not be verified.')
      }
      login(result)
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Could not verify the code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="my-auto flex w-full flex-col items-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-blue-700 text-xl font-bold text-white shadow-lg">
            MR
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Sign in to MRLBS</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We’ll email a one-time verification code to your IIT Kanpur address. Only
            <code className="mx-1">@iitk.ac.in</code> addresses are accepted.
          </p>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}
        {notice && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>}

        {!codeSent ? (
          <form className="space-y-4" onSubmit={requestCode}>
            <label className="block text-sm font-medium text-slate-700" htmlFor="institutional-email">
              IITK email address
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="institutional-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@iitk.ac.in"
              required
              type="email"
              value={email}
            />
            <button className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={busy} type="submit">
              {busy ? 'Sending…' : 'Email me a verification code'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={verifyCode}>
            <label className="block text-sm font-medium text-slate-700" htmlFor="verification-code">
              Six-digit verification code
            </label>
            <input
              autoComplete="one-time-code"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="verification-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              value={code}
            />
            <button className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={busy || code.length !== 6} type="submit">
              {busy ? 'Verifying…' : 'Verify and sign in'}
            </button>
            <button className="w-full text-sm font-medium text-blue-700 hover:text-blue-900" disabled={busy} onClick={() => { setCodeSent(false); setCode(''); setNotice(''); setError('') }} type="button">
              Use a different email address
            </button>
          </form>
        )}

        <p className="mt-5 text-center">
          <Link to="/" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Return to home</Link>
        </p>
      </div>
    </section>
  )
}
