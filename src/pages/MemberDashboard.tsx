import { useState, type FormEvent } from 'react'
import { apiClientConfig } from '../services/apiClient'

interface ResourceOption {
  id: string
  name: string
  type: string
  location: string
  capacity: number | null
  available: boolean
}
interface TimeSlot { startTime: string; endTime: string }
interface Availability { bookedSlots: TimeSlot[]; availableSlots: TimeSlot[] }
interface BookingResult { id: string; creditCost: number; status: string }
interface MemberBooking extends BookingResult { startTime: string; endTime: string; resourceId: string }
interface ApiProblem { reasonCode?: string; detail?: string }

export function MemberDashboard() {
  const [type, setType] = useState('')
  const [date, setDate] = useState('')
  const [searchStartTime, setSearchStartTime] = useState('')
  const [searchEndTime, setSearchEndTime] = useState('')
  const [capacity, setCapacity] = useState('')
  const [resources, setResources] = useState<ResourceOption[]>([])
  const [selectedResource, setSelectedResource] = useState<ResourceOption | null>(null)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [memberBookings, setMemberBookings] = useState<MemberBooking[]>([])
  const [editingBooking, setEditingBooking] = useState<MemberBooking | null>(null)
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

  async function searchResources(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSelectedResource(null)
    setAvailability(null)
    setBooking(null)
    const params = new URLSearchParams()
    if (type.trim()) params.set('type', type.trim())
    if (date) params.set('date', date)
    if (date && searchStartTime) {
      params.set('startTime', `${date}T${searchStartTime}`)
    }
    if (date && searchEndTime) {
      params.set('endTime', `${date}T${searchEndTime}`)
    }
    if (capacity) params.set('capacity', capacity)
    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/resources/search?${params}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Resources could not be loaded.')
      const results = (await response.json()) as ResourceOption[]
      setResources(results)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Resources could not be loaded.')
    } finally { setLoading(false) }
  }

  async function chooseResource(resource: ResourceOption) {
    if (selectedResource?.id === resource.id) {
      // Toggle off — close the panel
      setSelectedResource(null)
      setAvailability(null)
      setBooking(null)
      return
    }
    setSelectedResource(resource)
    setBooking(null)
    setStartTime(searchStartTime || '')
    setEndTime(searchEndTime || '')
    setError('')
    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/resources/${resource.id}/availability?date=${date}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Availability could not be loaded.')
      setAvailability((await response.json()) as Availability)
    } catch (availabilityError) {
      setError(availabilityError instanceof Error ? availabilityError.message : 'Availability could not be loaded.')
    }
  }

  function handleSubmitClick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedResource) return
    setShowConfirmModal(true)
  }

  async function confirmBooking() {
    if (!selectedResource) return
    setConfirmLoading(true)
    setBooking(null)
    setError('')
    try {
      const csrfResponse = await fetch(`${apiClientConfig.baseUrl}/auth/csrf`, { credentials: 'include' })
      if (!csrfResponse.ok) throw new Error('Could not prepare the secure booking request.')
      const csrf = (await csrfResponse.json()) as { token: string; headerName: string }
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
        body: JSON.stringify({ resourceId: selectedResource.id, startTime: `${date}T${startTime}`, endTime: `${date}T${endTime}` }),
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        if (problem?.reasonCode === 'INSUFFICIENT_CREDITS') throw new Error('You do not have enough credits for this booking.')
        if (problem?.reasonCode === 'SLOT_NO_LONGER_AVAILABLE') throw new Error('This slot is no longer available. Choose another time.')
        throw new Error(problem?.detail ?? 'The booking could not be submitted.')
      }
      setBooking((await response.json()) as BookingResult)
      setShowConfirmModal(false)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'The booking could not be submitted.')
      setShowConfirmModal(false)
    } finally { setConfirmLoading(false) }
  }

  async function loadBookings() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings`, { credentials: 'include' })
      if (!response.ok) throw new Error('Your bookings could not be loaded.')
      setMemberBookings((await response.json()) as MemberBooking[])
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Your bookings could not be loaded.')
    } finally { setLoading(false) }
  }

  async function modifyBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingBooking) return
    setLoading(true)
    setError('')
    try {
      const csrfResponse = await fetch(`${apiClientConfig.baseUrl}/auth/csrf`, { credentials: 'include' })
      if (!csrfResponse.ok) throw new Error('Could not prepare the secure booking request.')
      const csrf = (await csrfResponse.json()) as { token: string; headerName: string }
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings/${editingBooking.id}/time-window`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
        body: JSON.stringify({ startTime: editStartTime, endTime: editEndTime }),
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        if (problem?.reasonCode === 'SLOT_NO_LONGER_AVAILABLE') throw new Error('This slot is no longer available. Your original booking is unchanged.')
        if (problem?.reasonCode === 'BOOKING_NOT_MODIFIABLE') throw new Error('This booking can no longer be modified.')
        throw new Error(problem?.detail ?? 'The booking could not be modified.')
      }
      const updated = (await response.json()) as MemberBooking
      setMemberBookings((current) => current.map((bookingItem) => bookingItem.id === updated.id ? updated : bookingItem))
      setEditingBooking(null)
    } catch (modificationError) {
      setError(modificationError instanceof Error ? modificationError.message : 'The booking could not be modified.')
    } finally { setLoading(false) }
  }

  async function cancelBooking(memberBooking: MemberBooking) {
    setLoading(true)
    setError('')
    try {
      const csrfResponse = await fetch(`${apiClientConfig.baseUrl}/auth/csrf`, { credentials: 'include' })
      if (!csrfResponse.ok) throw new Error('Could not prepare the secure booking request.')
      const csrf = (await csrfResponse.json()) as { token: string; headerName: string }
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings/${memberBooking.id}`, {
        method: 'DELETE', credentials: 'include', headers: { [csrf.headerName]: csrf.token },
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        if (problem?.reasonCode === 'BOOKING_NOT_MODIFIABLE') throw new Error('This booking can no longer be cancelled.')
        throw new Error(problem?.detail ?? 'The booking could not be cancelled.')
      }
      const cancelled = (await response.json()) as MemberBooking
      setMemberBookings((current) => current.map((bookingItem) => bookingItem.id === cancelled.id ? cancelled : bookingItem))
    } catch (cancellationError) {
      setError(cancellationError instanceof Error ? cancellationError.message : 'The booking could not be cancelled.')
    } finally { setLoading(false) }
  }

  const isExpanded = (resourceId: string) => selectedResource?.id === resourceId

  return (
    <section className="mx-auto w-full max-w-4xl py-8">
      <header className="mb-8">
        <p className="text-sm font-semibold text-blue-700">Member area</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Find and book a resource</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Search by resource type, date, and capacity. Review availability and submit a booking.</p>
      </header>

      {/* ── Search form ────────────────────────────────────────────── */}
      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3 lg:grid-cols-6" onSubmit={searchResources}>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Type
          <input className={inputClassName} onChange={(event) => setType(event.target.value)} placeholder="e.g. Lecture Hall" value={type} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Date
          <input className={inputClassName} onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Start time (optional)
          <input className={inputClassName} onChange={(event) => setSearchStartTime(event.target.value)} type="time" value={searchStartTime} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">End time (optional)
          <input className={inputClassName} onChange={(event) => setSearchEndTime(event.target.value)} type="time" value={searchEndTime} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Minimum capacity
          <input className={inputClassName} min="1" onChange={(event) => setCapacity(event.target.value)} type="number" value={capacity} />
        </label>
        <button className="self-end rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">Search resources</button>
      </form>

      {/* ── Search results with status badges ──────────────────────── */}
      {resources.length > 0 && <section aria-label="Search results" className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Matching resources</h2>
        {resources.map((resource) => (
          <div key={resource.id}>
            {/* Resource row with status badge */}
            <article
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition ${
                isExpanded(resource.id)
                  ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
              onClick={() => void chooseResource(resource)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void chooseResource(resource) } }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{resource.name}</h3>
                </div>
                <p className="text-sm text-slate-600">
                  {resource.type} · {resource.location}
                  {resource.capacity != null && ` · Capacity: ${resource.capacity}`}
                </p>
              </div>
              {/* Status badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                  resource.available
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <span className={`inline-block size-2 rounded-full ${resource.available ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {resource.available ? 'Open' : 'Booked'}
              </span>
            </article>

            {/* ── Expandable booking panel ──────────────────────── */}
            {isExpanded(resource.id) && (
              <div className="relative mt-1 rounded-b-2xl border border-t-0 border-blue-200 bg-white p-6 shadow-sm">
                {/* Close button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedResource(null); setAvailability(null); setBooking(null) }}
                  className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close panel"
                >
                  ✕
                </button>

                {/* Open slots */}
                {availability && (
                  <>
                    <h4 className="mb-3 text-sm font-semibold text-slate-800">Open slots on {date}</h4>
                    {availability.availableSlots.length > 0 ? (
                      <div className="mb-5 flex flex-wrap gap-2">
                        {availability.availableSlots.map((slot) => (
                          <button
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
                            key={`${slot.startTime}-${slot.endTime}`}
                            onClick={(e) => { e.stopPropagation(); setStartTime(slot.startTime.slice(11, 16)); setEndTime(slot.endTime.slice(11, 16)) }}
                            type="button"
                          >
                            {formatSlot(slot)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mb-5 text-sm text-slate-500">No open slots on this date.</p>
                    )}

                    {/* Booked slots */}
                    {availability.bookedSlots.length > 0 && (
                      <>
                        <h4 className="mb-2 text-sm font-semibold text-slate-800">Already booked</h4>
                        <ul className="mb-5 list-inside list-disc text-sm text-slate-500">
                          {availability.bookedSlots.map((slot) => (
                            <li key={`${slot.startTime}-${slot.endTime}`}>{formatSlot(slot)}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}

                {/* Booking form */}
                <form className="space-y-4 border-t border-slate-200 pt-5" onSubmit={handleSubmitClick}>
                  <h4 className="text-sm font-semibold text-slate-900">Book this resource</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                      Start time
                      <input className={inputClassName} onChange={(event) => setStartTime(event.target.value)} required type="time" value={startTime} />
                    </label>
                    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                      End time
                      <input className={inputClassName} onChange={(event) => setEndTime(event.target.value)} required type="time" value={endTime} />
                    </label>
                  </div>
                  {error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}
                  {booking && <p aria-live="polite" className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">Booking confirmed! Cost: {booking.creditCost} credits.</p>}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedResource(null); setAvailability(null); setBooking(null) }}
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60" disabled={loading} type="submit">
                      Submit booking
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </section>}

      {error && !selectedResource && !editingBooking && <p aria-live="polite" className="mt-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}

      {/* ── Confirmation modal ─────────────────────────────────────── */}
      {showConfirmModal && selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close confirmation"
            >
              ✕
            </button>

            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-700 text-lg text-white">📋</span>
              <h3 className="text-xl font-semibold text-slate-900">Confirm Booking</h3>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Resource</span>
                <span className="font-semibold text-slate-900">{selectedResource.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start</span>
                <span className="font-medium text-slate-800">{date} {startTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">End</span>
                <span className="font-medium text-slate-800">{date} {endTime}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-500">Credits</span>
                <span className="font-bold text-blue-700">Calculated on confirmation</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmBooking()}
                disabled={confirmLoading}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
              >
                {confirmLoading ? 'Confirming…' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── My bookings ────────────────────────────────────────────── */}
      <section aria-label="My bookings" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900">My bookings</h2>
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60" disabled={loading} onClick={() => void loadBookings()} type="button">Refresh bookings</button>
        </div>
        {memberBookings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Load your bookings to view or change an upcoming time.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {memberBookings.map((memberBooking) => (
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3" key={memberBooking.id}>
                <div>
                  <p className="font-medium text-slate-900">{formatSlot(memberBooking)}</p>
                  <p className="text-sm text-slate-600">{memberBooking.status} · {memberBooking.creditCost} credits</p>
                </div>
                <div className="flex gap-2">
                  {memberBooking.status === 'CONFIRMED' && (
                    <button
                      className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800"
                      onClick={() => { setEditingBooking(memberBooking); setEditStartTime(memberBooking.startTime.slice(0, 16)); setEditEndTime(memberBooking.endTime.slice(0, 16)); setError('') }}
                      type="button"
                    >
                      Change time
                    </button>
                  )}
                  {['CONFIRMED', 'PENDING_APPROVAL'].includes(memberBooking.status) && (
                    <button
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-60"
                      disabled={loading}
                      onClick={() => void cancelBooking(memberBooking)}
                      type="button"
                    >
                      Cancel booking
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {editingBooking && (
          <form className="mt-5 space-y-4 border-t border-slate-200 pt-5" onSubmit={modifyBooking}>
            <h3 className="font-semibold text-slate-900">Change booking time</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-800">
                New start time
                <input className={inputClassName} onChange={(event) => setEditStartTime(event.target.value)} required type="datetime-local" value={editStartTime} />
              </label>
              <label className="space-y-2 text-sm font-semibold text-slate-800">
                New end time
                <input className={inputClassName} onChange={(event) => setEditEndTime(event.target.value)} required type="datetime-local" value={editEndTime} />
              </label>
            </div>
            {error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}
            <button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">{loading ? 'Saving…' : 'Save new time'}</button>
          </form>
        )}
      </section>
    </section>
  )
}

function formatSlot(slot: TimeSlot) {
  return `${slot.startTime.replace('T', ' ').slice(0, 16)} to ${slot.endTime.replace('T', ' ').slice(0, 16)}`
}

const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100'
