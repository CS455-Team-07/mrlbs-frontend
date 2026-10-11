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

  async function searchResources(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSelectedResource(null)
    setAvailability(null)
    const params = new URLSearchParams()
    if (type.trim()) params.set('type', type.trim())
    if (date) params.set('date', date)
    if (capacity) params.set('capacity', capacity)
    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/resources/search?${params}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Resources could not be loaded.')
      setResources((await response.json()) as ResourceOption[])
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Resources could not be loaded.')
    } finally { setLoading(false) }
  }

  async function chooseResource(resource: ResourceOption) {
    setSelectedResource(resource)
    setAvailability(null)
    setStartTime('')
    setEndTime('')
    setError('')
    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/resources/${resource.id}/availability?date=${date}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Availability could not be loaded.')
      setAvailability((await response.json()) as Availability)
    } catch (availabilityError) {
      setError(availabilityError instanceof Error ? availabilityError.message : 'Availability could not be loaded.')
    }
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedResource) return
    setLoading(true)
    setBooking(null)
    setError('')
    try {
      const csrfResponse = await fetch(`${apiClientConfig.baseUrl}/auth/csrf`, { credentials: 'include' })
      if (!csrfResponse.ok) throw new Error('Could not prepare the secure booking request.')
      const csrf = (await csrfResponse.json()) as { token: string; headerName: string }
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
        body: JSON.stringify({ resourceId: selectedResource.id, startTime, endTime }),
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        if (problem?.reasonCode === 'INSUFFICIENT_CREDITS') throw new Error('You do not have enough credits for this booking.')
        if (problem?.reasonCode === 'SLOT_NO_LONGER_AVAILABLE') throw new Error('This slot is no longer available. Choose another time.')
        throw new Error(problem?.detail ?? 'The booking could not be submitted.')
      }
      setBooking((await response.json()) as BookingResult)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'The booking could not be submitted.')
    } finally { setLoading(false) }
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

  return (
    <section className="mx-auto w-full max-w-4xl py-8">
      <header className="mb-8">
        <p className="text-sm font-semibold text-blue-700">Member area</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Find and book a resource</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Search by resource type, date, and capacity. Review booked and open times before submitting a booking.</p>
      </header>
      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-4" onSubmit={searchResources}>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Type
          <input className={inputClassName} onChange={(event) => setType(event.target.value)} value={type} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Date
          <input className={inputClassName} onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Minimum capacity
          <input className={inputClassName} min="1" onChange={(event) => setCapacity(event.target.value)} type="number" value={capacity} />
        </label>
        <button className="self-end rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">Search resources</button>
      </form>

      {resources.length > 0 && <section aria-label="Search results" className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Matching resources</h2>
        {resources.map((resource) => <article className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4" key={resource.id}>
          <div><h3 className="font-semibold text-slate-900">{resource.name}</h3><p className="text-sm text-slate-600">{resource.type} · {resource.location} · {resource.available ? 'Available' : 'Booked'}</p></div>
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => void chooseResource(resource)} type="button">View availability</button>
        </article>)}
      </section>}

      {selectedResource && availability && <section aria-label="Resource availability" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">{selectedResource.name} availability</h2>
        <h3 className="mt-4 text-sm font-semibold text-slate-800">Existing bookings</h3>
        {availability.bookedSlots.length ? <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">{availability.bookedSlots.map((slot) => <li key={`${slot.startTime}-${slot.endTime}`}>{formatSlot(slot)}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No bookings on this date.</p>}
        <h3 className="mt-4 text-sm font-semibold text-slate-800">Open slots</h3>
        {availability.availableSlots.length ? <div className="mt-2 flex flex-wrap gap-2">{availability.availableSlots.map((slot) => <button className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-800" key={`${slot.startTime}-${slot.endTime}`} onClick={() => { setStartTime(slot.startTime.slice(0, 16)); setEndTime(slot.endTime.slice(0, 16)) }} type="button">{formatSlot(slot)} · use</button>)}</div> : <p className="mt-2 text-sm text-slate-600">No open slots on this date.</p>}
      </section>}
      {error && selectedResource && !availability && <p aria-live="polite" className="mt-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}

      {selectedResource && availability && <form className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={submitBooking}>
        <h2 className="text-xl font-semibold text-slate-900">Submit booking</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-semibold text-slate-800">Start time<input className={inputClassName} onChange={(event) => setStartTime(event.target.value)} required type="datetime-local" value={startTime} /></label>
          <label className="block space-y-2 text-sm font-semibold text-slate-800">End time<input className={inputClassName} onChange={(event) => setEndTime(event.target.value)} required type="datetime-local" value={endTime} /></label>
        </div>
        {error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}
        {booking && <p aria-live="polite" className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">Booking confirmed. Cost: {booking.creditCost} credits.</p>}
        <div className="flex justify-end border-t border-slate-200 pt-5"><button className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">{loading ? 'Submitting…' : 'Submit booking'}</button></div>
      </form>}
      {error && !selectedResource && !editingBooking && <p aria-live="polite" className="mt-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}
      <section aria-label="My bookings" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-slate-900">My bookings</h2><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60" disabled={loading} onClick={() => void loadBookings()} type="button">Refresh bookings</button></div>
        {memberBookings.length === 0 ? <p className="mt-3 text-sm text-slate-600">Load your bookings to view or change an upcoming time.</p> : <ul className="mt-4 space-y-3">{memberBookings.map((memberBooking) => <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3" key={memberBooking.id}><div><p className="font-medium text-slate-900">{formatSlot(memberBooking)}</p><p className="text-sm text-slate-600">{memberBooking.status} · {memberBooking.creditCost} credits</p></div><div className="flex gap-2">{memberBooking.status === 'CONFIRMED' && <button className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800" onClick={() => { setEditingBooking(memberBooking); setEditStartTime(memberBooking.startTime.slice(0, 16)); setEditEndTime(memberBooking.endTime.slice(0, 16)); setError('') }} type="button">Change time</button>}{['CONFIRMED', 'PENDING_APPROVAL'].includes(memberBooking.status) && <button className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-60" disabled={loading} onClick={() => void cancelBooking(memberBooking)} type="button">Cancel booking</button>}</div></li>)}</ul>}
        {editingBooking && <form className="mt-5 space-y-4 border-t border-slate-200 pt-5" onSubmit={modifyBooking}><h3 className="font-semibold text-slate-900">Change booking time</h3><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-slate-800">New start time<input className={inputClassName} onChange={(event) => setEditStartTime(event.target.value)} required type="datetime-local" value={editStartTime} /></label><label className="space-y-2 text-sm font-semibold text-slate-800">New end time<input className={inputClassName} onChange={(event) => setEditEndTime(event.target.value)} required type="datetime-local" value={editEndTime} /></label></div>{error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}<button className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">{loading ? 'Saving…' : 'Save new time'}</button></form>}
      </section>
    </section>
  )
}

function formatSlot(slot: TimeSlot) {
  return `${slot.startTime.replace('T', ' ').slice(0, 16)} to ${slot.endTime.replace('T', ' ').slice(0, 16)}`
}

const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100'
