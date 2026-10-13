import { useCallback, useEffect, useState } from 'react'
import {
  decideBookingApproval,
  getBookingStatusHistory,
  getPendingApprovals,
} from '../services/bookingApprovalService'
import type { BookingApproval, BookingStatusEvent } from '../types/BookingApproval'

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString()
}

export function BookingApprovalQueue() {
  const [bookings, setBookings] = useState<BookingApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const [history, setHistory] = useState<BookingStatusEvent[]>([])

  const refresh = useCallback(async () => {
    try {
      setError('')
      setBookings(await getPendingApprovals())
    } catch (requestError) {
      console.error(requestError)
      setError('Unable to load pending approval requests.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void getPendingApprovals()
      .then((pending) => {
        if (active) setBookings(pending)
      })
      .catch((requestError) => {
        console.error(requestError)
        if (active) setError('Unable to load pending approval requests.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const decide = async (bookingId: string, decision: 'approve' | 'reject') => {
    try {
      setActingOn(bookingId)
      setError('')
      await decideBookingApproval(bookingId, decision)
      setHistoryFor(null)
      await refresh()
    } catch (requestError) {
      console.error(requestError)
      setError(`Unable to ${decision} this booking. Please retry.`)
    } finally {
      setActingOn(null)
    }
  }

  const toggleHistory = async (bookingId: string) => {
    if (historyFor === bookingId) {
      setHistoryFor(null)
      return
    }
    try {
      setHistoryFor(bookingId)
      setHistory(await getBookingStatusHistory(bookingId))
    } catch (requestError) {
      console.error(requestError)
      setError('Unable to load this booking’s audit history.')
      setHistoryFor(null)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Booking approvals</h2>
          <p className="mt-1 text-sm text-slate-500">
            Requests for approval-required resources wait here until reviewed.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
          {bookings.length} pending
        </span>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading approval requests...</p>
      ) : bookings.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
          There are no booking requests waiting for approval.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {bookings.map((booking) => (
            <li key={booking.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{booking.resourceName}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDateTime(booking.startTime)} – {formatDateTime(booking.endTime)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Booking {booking.id} · {booking.creditCost} credits
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleHistory(booking.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {historyFor === booking.id ? 'Hide history' : 'Audit history'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void decide(booking.id, 'reject')}
                    disabled={actingOn === booking.id}
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => void decide(booking.id, 'approve')}
                    disabled={actingOn === booking.id}
                    className="rounded-lg bg-purple-700 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-60"
                  >
                    {actingOn === booking.id ? 'Saving...' : 'Approve'}
                  </button>
                </div>
              </div>
              {historyFor === booking.id && (
                <ol className="mt-4 space-y-2 border-l-2 border-purple-200 pl-4 text-sm">
                  {history.map((event) => (
                    <li key={event.id}>
                      <p className="font-medium text-slate-800">
                        {event.fromStatus ?? 'Submitted'} → {event.toStatus}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(event.occurredAt)} · {event.actorEmail}
                        {event.note ? ` · ${event.note}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
