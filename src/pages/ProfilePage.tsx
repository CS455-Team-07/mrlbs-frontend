import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiClientConfig, csrfFetch } from '../services/apiClient'

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [name, setName] = useState(user?.name ?? '')
  const [institutionalId, setInstitutionalId] = useState(
    user?.institutionalId ?? '',
  )
  const [department, setDepartment] = useState(user?.department ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatarUrl ?? '',
  )
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [currentBalance, setCurrentBalance] = useState<number | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(false)
  const STARTING_CREDITS = 1000

  useEffect(() => {
    if (user?.role === 'member' && user?.email) {
      setLoadingCredits(true)
      csrfFetch(`${apiClientConfig.baseUrl}/auth/member-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.name }),
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.credits != null) {
            setCurrentBalance(Number(data.credits))
          }
        })
        .catch((err) => console.error('Failed to load credit balance', err))
        .finally(() => setLoadingCredits(false))
    }
  }, [user?.email, user?.role, user?.name])

  const usedCredits = currentBalance != null ? Math.max(0, STARTING_CREDITS - currentBalance) : null

  if (!user) {
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Profile
          </h1>

          <p className="mt-3 text-sm text-slate-600">
            Please sign in to view your profile.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Go to Login
          </button>
        </div>
      </section>
    )
  }

  const handleAvatarChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Profile picture must be smaller than 2 MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      return
    }

    setError('')

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result)
      }
    }

    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setError('')
    setSaved(false)

    if (!name.trim()) {
      setError('Please enter your full name.')
      return
    }

    if (!institutionalId.trim()) {
      setError('Please enter your institutional ID.')
      return
    }

    const updated = updateProfile({
      name: name.trim(),
      institutionalId: institutionalId.trim(),
      department: department.trim(),
      bio: bio.trim(),
      avatarUrl: avatarPreview || undefined,
      profileCompleted: true,
    })

    if (!updated) {
      setError('Unable to save your profile. Please try again.')
      return
    }

    setSaved(true)
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const createdDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : 'Not available'

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">

      {/* Profile header */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="h-32 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700" />

        <div className="px-6 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div className="flex items-end gap-4">
              <div className="relative">

                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={`${user.name} profile`}
                    className="size-24 rounded-2xl border-4 border-white object-cover shadow-md"
                  />
                ) : (
                  <div className="grid size-24 place-items-center rounded-2xl border-4 border-white bg-blue-100 text-2xl font-bold text-blue-700 shadow-md">
                    {initials || 'U'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-full border-2 border-white bg-blue-700 text-white shadow-md transition hover:bg-blue-800"
                  aria-label="Change profile picture"
                  title="Change profile picture"
                >
                  ✎
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="pb-1">
                <h1 className="text-2xl font-bold text-slate-950">
                  {user.name}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${user.role === 'admin'
                ? 'border border-purple-200 bg-purple-50 text-purple-700'
                : 'border border-blue-200 bg-blue-50 text-blue-700'
                }`}
            >
              {user.role}
            </span>

          </div>
        </div>
      </div>

      {/* Account overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Account ID
          </p>

          <p className="mt-2 break-all text-sm font-semibold text-slate-900">
            {user.id}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Role
          </p>

          <p className="mt-2 text-sm font-semibold capitalize text-slate-900">
            {user.role}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Profile Status
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {user.profileCompleted ? 'Complete' : 'Incomplete'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Member Since
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {createdDate}
          </p>
        </div>

      </div>

      {/* Member Credits Overview */}
      {user.role === 'member' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Credits Overview</h2>
              <p className="mt-0.5 text-xs text-slate-500">Track your initial allotment, debits, and remaining balance</p>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              Active Member Account
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Initial credits */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition hover:border-slate-300">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Initial Credits
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {STARTING_CREDITS.toLocaleString()} <span className="text-xs font-normal text-slate-500">Credits</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Allotted upon account registration</p>
            </div>

            {/* Used credits */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 transition hover:border-amber-300">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Used Credits
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-900">
                {loadingCredits ? '…' : (usedCredits ?? 0).toLocaleString()}{' '}
                <span className="text-xs font-normal text-amber-700">Credits</span>
              </p>
              <p className="mt-1 text-xs text-amber-700/80">Debited for confirmed bookings & waitlists</p>
            </div>

            {/* Current balance */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 transition hover:border-emerald-300">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Current Balance
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {loadingCredits ? '…' : (currentBalance ?? STARTING_CREDITS).toLocaleString()}{' '}
                <span className="text-xs font-normal text-emerald-600">Credits</span>
              </p>
              <p className="mt-1 text-xs text-emerald-700/80">Available to reserve upcoming slots</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white shadow-sm"
      >

        <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <h2 className="text-xl font-bold text-slate-900">
            Personal Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Keep your institutional profile information up to date.
          </p>
        </div>

        <div className="grid gap-6 p-6 sm:p-8">

          {/* Full name */}
          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-semibold text-slate-700"
            >
              Full Name
            </label>

            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your full name"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="profile-email"
              className="block text-sm font-semibold text-slate-700"
            >
              Institutional Email
            </label>

            <input
              id="profile-email"
              value={user.email}
              disabled
              className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Your institutional email is linked to your account and cannot
              be changed here.
            </p>
          </div>

          {/* ID + department */}
          <div className="grid gap-6 sm:grid-cols-2">

            <div>
              <label
                htmlFor="profile-id"
                className="block text-sm font-semibold text-slate-700"
              >
                Institutional ID / Roll Number
              </label>

              <input
                id="profile-id"
                value={institutionalId}
                onChange={(event) =>
                  setInstitutionalId(event.target.value)
                }
                placeholder="e.g. 230123"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="profile-department"
                className="block text-sm font-semibold text-slate-700"
              >
                Department
              </label>

              <input
                id="profile-department"
                value={department}
                onChange={(event) =>
                  setDepartment(event.target.value)
                }
                placeholder="e.g. Computer Science & Engineering"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="profile-bio"
              className="block text-sm font-semibold text-slate-700"
            >
              Bio
            </label>

            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Tell us a little about yourself..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {bio.length}/500
            </p>
          </div>

          {/* Role information */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div
                className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${user.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
                  }`}
              >
                {user.role === 'admin' ? 'A' : 'M'}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {user.role === 'admin'
                    ? 'Administrator Account'
                    : 'Member Account'}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Your account role is assigned by the system based on your
                  institutional authorization. It cannot be changed from your
                  profile.
                </p>
              </div>
            </div>
          </div>

          {/* Errors / success */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {saved && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Your profile has been saved successfully.
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">

          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Home
          </button>

          <button
            type="submit"
            className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Save Profile
          </button>

        </div>
      </form>

    </section>
  )
}