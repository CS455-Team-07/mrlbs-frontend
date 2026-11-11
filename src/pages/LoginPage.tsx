import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiClientConfig, csrfFetch } from '../services/apiClient'
import type { AuthenticatedIdentity } from '../services/userService'

type Mode = 'login' | 'request' | 'reset'

export function LoginPage() {
  const { user, login } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/member'} replace />

  function changeMode(next: Mode) {
    setMode(next)
    setPassword('')
    setConfirmation('')
    setCode('')
    setError('')
    setNotice('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const address = email.trim().toLowerCase()
    setError('')
    setNotice('')
    if (!address.endsWith('@iitk.ac.in')) {
      setError('Use your @iitk.ac.in email address.')
      return
    }
    if (mode === 'reset' && password !== confirmation) {
      setError('The passwords must match.')
      return
    }

    const endpoint = { login: 'login', request: 'forgot-password', reset: 'reset-password' }[mode]
    const body = { email: address, ...(mode !== 'request' && { password }), ...(mode === 'reset' && { code }) }

    setBusy(true)
    try {
      const url = `${apiClientConfig.baseUrl}/auth/${endpoint}`
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
      let response = await csrfFetch(url, options)
      if (response.status === 403) response = await csrfFetch(url, options, true)
      if (!response.ok) {
        const problem = await response.json().catch(() => null)
        const fallback = response.status === 429
          ? 'Too many attempts. Wait a few minutes and try again.'
          : 'The request could not be completed. Please try again.'
        throw new Error(problem?.message || fallback)
      }

      if (mode === 'login') {
        login((await response.json()) as AuthenticatedIdentity)
      } else if (mode === 'request') {
        setEmail(address)
        changeMode('reset')
        setNotice(`A six-digit code was sent to ${address}. It expires in five minutes.`)
      } else {
        changeMode('login')
        setNotice('Password saved. Sign in with your new password.')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The request failed.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
  const linkClass = 'text-sm font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-60'

  return (
    <section className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === 'login' ? 'Sign in' : mode === 'request' ? 'Set or reset your password' : 'Choose a new password'}
        </h1>
        <p className="mb-6 mt-2 text-sm text-slate-600">
          {mode === 'login' ? 'Use your IIT Kanpur member or administrator account.' :
            mode === 'request' ? 'We’ll email a one-time verification code to your IITK address.' :
              'Enter the code from your email and choose a password with at least 12 characters.'}
        </p>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

        <form className="space-y-4" onSubmit={submit}>
          <fieldset disabled={busy} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              IITK email address
              <input className={inputClass} type="email" autoComplete="username" required maxLength={254}
                placeholder="username@iitk.ac.in" readOnly={mode === 'reset'}
                value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            {mode === 'reset' && (
              <label className="block text-sm font-medium text-slate-700">
                Verification code
                <input className={inputClass} autoComplete="one-time-code" inputMode="numeric"
                  pattern="[0-9]{6}" maxLength={6} required value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
              </label>
            )}
            {mode !== 'request' && (
              <label className="block text-sm font-medium text-slate-700">
                {mode === 'login' ? 'Password' : 'New password'}
                <input className={inputClass} type="password" required maxLength={128}
                  minLength={mode === 'reset' ? 12 : undefined}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
            )}
            {mode === 'reset' && (
              <label className="block text-sm font-medium text-slate-700">
                Confirm new password
                <input className={inputClass} type="password" autoComplete="new-password"
                  required minLength={12} maxLength={128} value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)} />
              </label>
            )}
            <button className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60" type="submit">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'request' ? 'Send verification code' : 'Save password'}
            </button>
          </fieldset>
        </form>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {mode === 'login' ? (
            <button className={linkClass} type="button" disabled={busy} onClick={() => changeMode('request')}>
              Forgot password or first-time sign-in?
            </button>
          ) : (
            <>
              <button className={linkClass} type="button" disabled={busy} onClick={() => changeMode('login')}>Back to sign in</button>
              {mode === 'reset' && (
                <button className={linkClass} type="button" disabled={busy} onClick={() => changeMode('request')}>
                  Request another code
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
