import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiClientConfig, csrfFetch } from '../services/apiClient'

interface MemberBooking {
  id: string
  resourceId: string
  resourceName?: string
  startTime: string // ISO
  endTime: string // ISO
  status: string
  creditCost: number | null
  clashes?: boolean | null
  memberId?: string
}

export function MemberHistory() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [bookings, setBookings] = useState<MemberBooking[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function fetchHistory() {
      setLoading(true)
      setError(null)
      try {
        const headers: Record<string, string> = {}
        if (user?.email) {
          headers['X-User-Email'] = user.email
        }

        let response = await fetch(`${apiClientConfig.baseUrl}/bookings`, {
          credentials: 'include',
          headers,
        })

        // If unauthorized or failed and user is logged in, attempt session re-sync once
        if (!response.ok && user?.email) {
          try {
            await csrfFetch(`${apiClientConfig.baseUrl}/auth/member-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, name: user.name }),
              credentials: 'include',
            })
            response = await fetch(`${apiClientConfig.baseUrl}/bookings`, {
              credentials: 'include',
              headers,
            })
          } catch {
            // Re-sync attempt failed, proceed to error check
          }
        }

        if (!response.ok) {
          throw new Error('Failed to load booking history')
        }

        const data = (await response.json()) as MemberBooking[]
        if (!isCancelled) {
          setBookings(Array.isArray(data) ? data : [])
        }
      } catch (e) {
        if (!isCancelled) {
          setError((e as Error).message || 'Failed to load booking history')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void fetchHistory()

    return () => {
      isCancelled = true
    }
  }, [user?.email, user?.name])

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return iso
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return iso
    }
  }

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return iso.slice(11, 16)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso.slice(11, 16)
    }
  }

  const calcDuration = (start: string, end: string) => {
    try {
      const diff = new Date(end).getTime() - new Date(start).getTime()
      if (isNaN(diff) || diff < 0) return '—'
      const mins = Math.round(diff / 60000)
      const h = Math.floor(mins / 60)
      const m = mins % 60
      if (h === 0) return `${m}m`
      if (m === 0) return `${h}h`
      return `${h}h ${m}m`
    } catch {
      return '—'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'border border-emerald-200 bg-emerald-50 text-emerald-700'
      case 'IN_PROGRESS':
        return 'border border-blue-200 bg-blue-50 text-blue-700'
      case 'DRAFT':
        return 'border border-amber-200 bg-amber-50 text-amber-700'
      case 'CANCELLED':
        return 'border border-slate-200 bg-slate-100 text-slate-600'
      case 'PENDING':
      case 'PENDING_APPROVAL':
        return 'border border-indigo-200 bg-indigo-50 text-indigo-700'
      default:
        return 'border border-slate-200 bg-slate-100 text-slate-700'
    }
  }

  const now = new Date().getTime()

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const upcoming: MemberBooking[] = []
    const past: MemberBooking[] = []

    bookings.forEach((b) => {
      const endTimeMs = new Date(b.endTime).getTime()
      if (!isNaN(endTimeMs) && endTimeMs >= now) {
        upcoming.push(b)
      } else {
        past.push(b)
      }
    })

    return { upcomingBookings: upcoming, pastBookings: past }
  }, [bookings, now])

  const renderBookingTable = (items: MemberBooking[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-auto border-collapse text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time Window</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Credits</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {items.map((b) => (
              <tr key={b.id} className="transition hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {b.resourceName || (
                    <span className="font-mono text-xs text-slate-400">
                      {b.resourceId || 'Archived Resource'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{formatDate(b.startTime)}</td>
                <td className="px-4 py-3 font-medium">
                  {formatTime(b.startTime)} – {formatTime(b.endTime)}
                </td>
                <td className="px-4 py-3 text-slate-600">{calcDuration(b.startTime, b.endTime)}</td>
                <td className="px-4 py-3 font-semibold text-blue-700">
                  {b.creditCost != null ? `${b.creditCost} cr` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${getStatusBadgeClass(
                      b.status,
                    )}`}
                  >
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-5xl py-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/member')}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Booking History</h1>
          <p className="mt-1 text-sm text-slate-600">
            View your upcoming reservations and past lab resource bookings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/member')}
          className="self-start rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:self-center"
        >
          + Book New Resource
        </button>
      </header>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Loading your bookings…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-sm" role="alert">
          <div className="flex items-center gap-2 font-semibold">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <p className="mt-2 text-xs text-red-600">
            Please make sure you are logged in with an authorized IITK email and the backend is running.
          </p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="space-y-10">
          {/* Current / Upcoming Bookings Section */}
          <section aria-labelledby="upcoming-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="upcoming-heading" className="text-xl font-semibold text-slate-900">
                Current & Upcoming Bookings
              </h2>
              <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-800">
                {upcomingBookings.length}
              </span>
            </div>
            {renderBookingTable(upcomingBookings, 'No current or upcoming bookings.')}
          </section>

          {/* Past Bookings Section */}
          <section aria-labelledby="past-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="past-heading" className="text-xl font-semibold text-slate-900">
                Past Bookings
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700">
                {pastBookings.length}
              </span>
            </div>
            {renderBookingTable(pastBookings, 'No past bookings found.')}
          </section>
        </div>
      )}
    </section>
  )
}
