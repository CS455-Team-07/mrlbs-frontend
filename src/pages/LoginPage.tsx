import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAuthorizedAdmin } from '../config/adminConfig'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (selectedRole: 'admin' | 'member') => {
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Please enter your IITK email address.')
      return
    }

    if (!normalizedEmail.endsWith('@iitk.ac.in')) {
      setError('Please use a valid IITK email address.')
      return
    }

    const actualRole = isAuthorizedAdmin(normalizedEmail)
      ? 'admin'
      : 'member'

    if (selectedRole !== actualRole) {
      setError(
        `This email is registered as a ${actualRole}. Please use "Login as ${
          actualRole === 'admin' ? 'Admin' : 'Member'
        }".`,
      )
      return
    }

    login({
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
    })

    navigate('/', { replace: true })
  }

  return (
    <section className="mx-auto w-full max-w-xl py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">

        {/* Heading */}
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-700 text-lg font-bold text-white">
            MR
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
            Multi-Resource Lab Booking System
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            Institutional Login
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in using your IIT Kanpur institutional email address.
          </p>
        </div>

        {/* Email */}
        <div className="mt-8">
          <label
            htmlFor="iitk-email"
            className="block text-sm font-semibold text-slate-700"
          >
            IITK Email Address
          </label>

          <input
            id="iitk-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError('')
            }}
            placeholder="yourname@iitk.ac.in"
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </div>

        {/* Login buttons */}
        <div className="mt-7 grid gap-3 sm:grid-cols-2">

          <button
            type="button"
            onClick={() => handleLogin('admin')}
            className="flex items-center justify-center gap-3 rounded-xl bg-purple-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800"
          >
            <span className="grid size-6 place-items-center rounded-full bg-purple-950/40 text-xs font-bold">
              A
            </span>

            Login as Admin
          </button>

          <button
            type="button"
            onClick={() => handleLogin('member')}
            className="flex items-center justify-center gap-3 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            <span className="grid size-6 place-items-center rounded-full bg-blue-950/40 text-xs font-bold">
              M
            </span>

            Login as Member
          </button>

        </div>

        {/* Explanation */}
        <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs leading-5 text-slate-600">
            Your role is determined by your IITK email address. Admin access
            is granted only to emails registered in the authorized admin
            configuration.
          </p>
        </div>

      </div>
    </section>
  )
}