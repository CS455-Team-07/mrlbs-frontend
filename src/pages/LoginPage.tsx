import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiClientConfig } from '../services/apiClient'
import { authenticationEnabled } from '../config/authConfig'

interface AuthenticatedUser {
  id: string
  name: string
  email: string
}

export function LoginPage() {
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const authenticated = searchParams.has('authenticated')
  const authenticationError = searchParams.get('error')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [status, setStatus] = useState(authenticated ? 'Checking your sign-in…' : '')

  useEffect(() => {
    if (!authenticationEnabled || !authenticated) return

    let cancelled = false

    async function loadUser() {
      try {
        const response = await fetch(`${apiClientConfig.baseUrl}/auth/me`, {
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error('Your sign-in could not be verified. Please try again.')
        }

        const signedInUser = (await response.json()) as AuthenticatedUser
        if (!signedInUser.email.trim().toLowerCase().endsWith('@iitk.ac.in')) {
          throw new Error('Use the Google Workspace account for iitk.ac.in to sign in.')
        }

        login(signedInUser)
        if (!cancelled) {
          setUser(signedInUser)
          setStatus('')
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(
            error instanceof Error
              ? error.message
              : 'Your sign-in could not be verified. Please try again.',
          )
        }
      }
    }

    void loadUser()
    return () => {
      cancelled = true
    }
  }, [authenticated, login])

  if (!authenticationEnabled) return <Navigate to="/" replace />

  const errorMessage =
    authenticationError === 'institutional-domain'
      ? 'Use the Google Workspace account for iitk.ac.in to sign in.'
      : authenticationError
        ? 'Google sign-in did not complete. Please try again.'
        : ''

  return (
    <section className="my-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold text-blue-700">Institutional sign-in</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        Sign in to MRLBS
      </h1>
      <p className="mt-3 max-w-xl text-slate-600">
        Continue with your IIT Kanpur Google Workspace account. Only verified
        identities from the configured institutional domain can access MRLBS.
      </p>

      {errorMessage && (
        <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
          {errorMessage}
        </p>
      )}

      {status && (
        <p className="mt-6 text-sm text-slate-700" aria-live="polite" role="status">
          {status}
        </p>
      )}

      {user ? (
        <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          <p className="font-semibold">Signed in as {user.name}</p>
          <p className="mt-1">{user.email}</p>
        </div>
      ) : (
        <a
          className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          href={`${apiClientConfig.authBaseUrl}/oauth2/authorization/google`}
        >
          Continue with Google
        </a>
      )}

      <p className="mt-6">
        <Link to="/" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
          Return to home
        </Link>
      </p>
    </section>
  )
}
