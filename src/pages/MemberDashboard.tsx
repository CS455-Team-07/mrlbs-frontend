import { useState, type FormEvent } from 'react'
import { apiClientConfig } from '../services/apiClient'

interface BookingResult {
  id: string
  creditCost: number
  status: string
}

interface ApiProblem {
  reasonCode?: string
  detail?: string
}

export function MemberDashboard() {
  const [resourceId, setResourceId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setBooking(null)
    setError('')
    try {
      const csrfResponse = await fetch(`${apiClientConfig.baseUrl}/auth/csrf`, {
        credentials: 'include',
      })
      if (!csrfResponse.ok) throw new Error('Could not prepare the secure booking request.')
      const csrf = (await csrfResponse.json()) as { token: string; headerName: string }
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
        body: JSON.stringify({
          resourceId,
          startTime,
          endTime,
        }),
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        if (problem?.reasonCode === 'INSUFFICIENT_CREDITS') {
          throw new Error('You do not have enough credits for this booking.')
        }
        if (problem?.reasonCode === 'SLOT_NO_LONGER_AVAILABLE') {
          throw new Error('This slot is no longer available. Choose another time.')
        }
        throw new Error(problem?.detail ?? 'The booking could not be submitted.')
      }
      setBooking((await response.json()) as BookingResult)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'The booking could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl py-8">
      <header className="mb-8">
        <p className="text-sm font-semibold text-blue-700">Member area</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Book a resource</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Submit a time window for a resource. The server validates the request and checks your available credits.</p>
      </header>
      <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={submitBooking}>
        <label className="block space-y-2 text-sm font-semibold text-slate-800" htmlFor="booking-resource">
          Resource ID
          <input className={inputClassName} id="booking-resource" onChange={(event) => setResourceId(event.target.value)} required value={resourceId} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-semibold text-slate-800" htmlFor="booking-start">
            Start time
            <input className={inputClassName} id="booking-start" onChange={(event) => setStartTime(event.target.value)} required type="datetime-local" value={startTime} />
          </label>
          <label className="block space-y-2 text-sm font-semibold text-slate-800" htmlFor="booking-end">
            End time
            <input className={inputClassName} id="booking-end" onChange={(event) => setEndTime(event.target.value)} required type="datetime-local" value={endTime} />
          </label>
        </div>
        {error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}
        {booking && <p aria-live="polite" className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">Booking confirmed. Cost: {booking.creditCost} credits.</p>}
        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? 'Submitting booking…' : 'Submit booking'}
          </button>
        </div>
      </form>
    </section>
  )
}

const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100'
