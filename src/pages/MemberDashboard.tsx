import { useState, useEffect, useContext, type FormEvent } from 'react'
import { apiClientConfig, getCsrfToken } from '../services/apiClient'
import { AuthContext } from '../context/authContextInstance'
import { AiAssistantDrawer } from '../components/AiAssistantDrawer'
import type { ResourceRecommendation } from '../services/aiService'

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
interface BookingResult { id: string; creditCost: number; status: string; clashes?: boolean }
interface MemberBooking extends BookingResult {
  startTime: string
  endTime: string
  resourceId: string
  resourceName?: string
}
interface ApiProblem { reasonCode?: string; detail?: string }

export function MemberDashboard() {
  const auth = useContext(AuthContext)
  const user = auth?.user
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

  // Draft and Modal States
  const [draftBooking, setDraftBooking] = useState<BookingResult | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [rejectionModalReason, setRejectionModalReason] = useState<string | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<MemberBooking | null>(null)
  const [showAiAssistant, setShowAiAssistant] = useState(false)

  const handleSelectRecommendation = async (rec: ResourceRecommendation) => {
    const chosenDate = rec.date || date
    if (rec.type) setType(rec.type)
    if (rec.date) setDate(rec.date)
    const slotStart = rec.suggestedStartTime || rec.requestedStartTime
    const slotEnd = rec.suggestedEndTime || rec.requestedEndTime
    let formattedStart = searchStartTime
    let formattedEnd = searchEndTime
    if (slotStart) {
      formattedStart = slotStart.length >= 5 ? slotStart.substring(0, 5) : slotStart
      setStartTime(formattedStart)
      setSearchStartTime(formattedStart)
    }
    if (slotEnd) {
      formattedEnd = slotEnd.length >= 5 ? slotEnd.substring(0, 5) : slotEnd
      setEndTime(formattedEnd)
      setSearchEndTime(formattedEnd)
    }
    if (rec.capacity) setCapacity(String(rec.capacity))

    const targetOpt: ResourceOption = {
      id: rec.resourceId,
      name: rec.name,
      type: rec.type,
      location: rec.location,
      capacity: rec.capacity,
      available: rec.available,
    }

    setResources((prev) => {
      const exists = prev.some((r) => r.id === rec.resourceId)
      return exists ? prev : [targetOpt, ...prev]
    })

    await chooseResource(targetOpt, chosenDate, formattedStart, formattedEnd)
  }

  const isClashing = Boolean(
    draftBooking?.clashes ||
    (availability?.bookedSlots?.some((slot) => {
      const uStart = new Date(`${date}T${startTime}`).getTime()
      const uEnd = new Date(`${date}T${endTime}`).getTime()
      const sStart = new Date(slot.startTime).getTime()
      const sEnd = new Date(slot.endTime).getTime()
      return !isNaN(uStart) && !isNaN(uEnd) && !isNaN(sStart) && !isNaN(sEnd) && uStart < sEnd && uEnd > sStart
    }))
  )

  // Auto-sync member session and auto-load bookings on mount
  useEffect(() => {
    async function initMemberSession() {
      if (user?.email) {
        try {
          await fetch(`${apiClientConfig.baseUrl}/auth/member-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, name: user.name }),
            credentials: 'include',
          })
        } catch (e) {
          console.warn('Could not sync member session with backend', e)
        }
      }
      void loadBookings()
    }
    void initMemberSession()
  }, [user?.email, user?.name])

  function getFriendlyErrorMessage(problem: ApiProblem | null): string {
    if (!problem) return 'The booking could not be processed.'
    if (problem.reasonCode === 'DURATION_TOO_SHORT') {
      return problem.detail || 'The booking duration is shorter than the minimum required duration for this resource.'
    }
    if (problem.reasonCode === 'DURATION_TOO_LONG') {
      return problem.detail || 'The booking duration exceeds the maximum allowed duration for this resource.'
    }
    if (problem.reasonCode === 'BUFFER_TIME_VIOLATION') {
      return problem.detail || 'The booking violates the required buffer time between lab sessions.'
    }
    if (problem.reasonCode === 'SLOT_CONFLICT') {
      return problem.detail || 'This time window clashes with an already booked slot. Please select the exact slot to go to waitlist or choose a different time.'
    }
    if (problem.reasonCode === 'QUOTA_EXCEEDED') {
      return problem.detail || 'You have reached the maximum active bookings quota for this resource.'
    }
    if (problem.reasonCode === 'SLOT_NO_LONGER_AVAILABLE') {
      return problem.detail || 'This slot is no longer available. Please choose another time.'
    }
    if (problem.reasonCode === 'INSUFFICIENT_CREDITS') {
      return problem.detail || 'You do not have enough credits for this booking.'
    }
    if (problem.reasonCode === 'INVALID_TIME_WINDOW') {
      return problem.detail || 'The requested booking time window is invalid.'
    }
    return problem.detail || 'The booking request could not be completed.'
  }

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

  async function chooseResource(
    resource: ResourceOption,
    targetDate?: string,
    targetStart?: string,
    targetEnd?: string
  ) {
    if (selectedResource?.id === resource.id) {
      setSelectedResource(null)
      setAvailability(null)
      setBooking(null)
      return
    }
    const effectiveDate = targetDate || date
    const effectiveStart = targetStart !== undefined ? targetStart : (searchStartTime || '')
    const effectiveEnd = targetEnd !== undefined ? targetEnd : (searchEndTime || '')
    setSelectedResource(resource)
    setBooking(null)
    setStartTime(effectiveStart)
    setEndTime(effectiveEnd)
    setError('')
    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/resources/${resource.id}/availability?date=${effectiveDate}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Availability could not be loaded.')
      const avail = (await response.json()) as Availability
      setAvailability(avail)
      if (!effectiveStart || !effectiveEnd) {
        setResources((current) =>
          current.map((r) => (r.id === resource.id ? { ...r, available: avail.availableSlots.length > 0 } : r))
        )
      }
    } catch (availabilityError) {
      setError(availabilityError instanceof Error ? availabilityError.message : 'Availability could not be loaded.')
    }
  }

  async function handleSubmitClick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedResource) return
    setLoading(true)
    setError('')
    try {
      const csrf = await getCsrfToken()
      let response = await fetch(`${apiClientConfig.baseUrl}/bookings/draft`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
        body: JSON.stringify({ resourceId: selectedResource.id, startTime: `${date}T${startTime}`, endTime: `${date}T${endTime}` }),
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        if (problem?.detail?.includes('Authenticated member identity is required') && user?.email) {
          // Re-sync session cookie with backend and retry once
          await fetch(`${apiClientConfig.baseUrl}/auth/member-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, name: user.name }),
            credentials: 'include',
          })
          response = await fetch(`${apiClientConfig.baseUrl}/bookings/draft`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
            body: JSON.stringify({ resourceId: selectedResource.id, startTime: `${date}T${startTime}`, endTime: `${date}T${endTime}` }),
          })
        }
        if (!response.ok) {
          const retryProblem = (await response.json().catch(() => null)) as ApiProblem | null
          const msg = getFriendlyErrorMessage(retryProblem || problem)
          setRejectionModalReason(msg)
          setShowRejectionModal(true)
          return
        }
      }
      const draft = (await response.json()) as BookingResult
      setDraftBooking(draft)
      setShowConfirmModal(true)
    } catch (submissionError) {
      const msg = submissionError instanceof Error ? submissionError.message : 'The draft booking could not be created.'
      setRejectionModalReason(msg)
      setShowRejectionModal(true)
    } finally { setLoading(false) }
  }

  async function cancelDraft(bookingId?: string) {
    const idToDelete = bookingId || draftBooking?.id
    setShowConfirmModal(false)
    setDraftBooking(null)
    if (idToDelete) {
      try {
        const csrf = await getCsrfToken()
        await fetch(`${apiClientConfig.baseUrl}/bookings/${idToDelete}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { [csrf.headerName]: csrf.token },
        })
      } catch (err) {
        console.warn('Could not delete draft on cancel', err)
      }
      void loadBookings()
    }
  }

  async function confirmBooking() {
    if (!draftBooking) return
    setConfirmLoading(true)
    setError('')
    try {
      const csrf = await getCsrfToken()
      let response = await fetch(`${apiClientConfig.baseUrl}/bookings/${draftBooking.id}/confirm`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        if (problem?.detail?.includes('Authenticated member identity is required') && user?.email) {
          // Re-sync session cookie with backend and retry once
          await fetch(`${apiClientConfig.baseUrl}/auth/member-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, name: user.name }),
            credentials: 'include',
          })
          response = await fetch(`${apiClientConfig.baseUrl}/bookings/${draftBooking.id}/confirm`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
          })
        }
        if (!response.ok) {
          const retryProblem = (await response.json().catch(() => null)) as ApiProblem | null
          const msg = getFriendlyErrorMessage(retryProblem || problem)
          await cancelDraft(draftBooking.id)
          setRejectionModalReason(msg)
          setShowRejectionModal(true)
          return
        }
      }
      const confirmed = (await response.json()) as BookingResult
      setBooking(confirmed)
      setShowConfirmModal(false)
      setDraftBooking(null)
      void loadBookings()
    } catch (submissionError) {
      if (draftBooking) {
        await cancelDraft(draftBooking.id)
      } else {
        setShowConfirmModal(false)
      }
      const msg = submissionError instanceof Error ? submissionError.message : 'The booking could not be confirmed.'
      setRejectionModalReason(msg)
      setShowRejectionModal(true)
    } finally { setConfirmLoading(false) }
  }

  async function loadBookings() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings`, { credentials: 'include' })
      if (!response.ok) throw new Error('Your bookings could not be loaded.')
      const data = (await response.json().catch(() => null)) as unknown
      setMemberBookings(Array.isArray(data) ? (data as MemberBooking[]) : [])
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
      const csrf = await getCsrfToken()
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings/${editingBooking.id}/time-window`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
        body: JSON.stringify({ startTime: editStartTime, endTime: editEndTime }),
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        const msg = getFriendlyErrorMessage(problem)
        setError(msg)
        return
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
      const csrf = await getCsrfToken()
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings/${memberBooking.id}`, {
        method: 'DELETE', credentials: 'include', headers: { [csrf.headerName]: csrf.token },
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        if (problem?.reasonCode === 'BOOKING_NOT_MODIFIABLE') throw new Error('This booking can no longer be cancelled.')
        throw new Error(problem?.detail ?? 'The booking could not be cancelled.')
      }
      if (response.status === 204) {
        setMemberBookings((current) => current.filter((bookingItem) => bookingItem.id !== memberBooking.id))
      } else {
        const cancelled = (await response.json().catch(() => null)) as MemberBooking | null
        if (cancelled) {
          setMemberBookings((current) => current.map((bookingItem) => bookingItem.id === cancelled.id ? cancelled : bookingItem))
        } else {
          setMemberBookings((current) => current.filter((bookingItem) => bookingItem.id !== memberBooking.id))
        }
      }
      void loadBookings()
    } catch (cancellationError) {
      setError(cancellationError instanceof Error ? cancellationError.message : 'The booking could not be cancelled.')
    } finally { setLoading(false) }
  }

  const isExpanded = (resourceId: string) => selectedResource?.id === resourceId

  // Group bookings by date
  const bookingsByDate: Record<string, MemberBooking[]> = {}
  ;(Array.isArray(memberBookings) ? memberBookings : []).forEach((b) => {
    if (!b?.startTime) return
    const bookingDate = b.startTime.slice(0, 10)
    if (!bookingsByDate[bookingDate]) {
      bookingsByDate[bookingDate] = []
    }
    bookingsByDate[bookingDate].push(b)
  })
  const sortedDates = Object.keys(bookingsByDate).sort().reverse()

  return (
    <section className="mx-auto w-full max-w-4xl py-8">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">Member area</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Find and book a resource</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Search by resource type, date, and capacity. Review availability and submit a booking.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAiAssistant(true)}
          className="self-start sm:self-center inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Ask AI Assistant
        </button>
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
                    <h4 className="mb-3 text-sm font-semibold text-slate-800">Open slots</h4>
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
                  {booking && (
                    <p
                      aria-live="polite"
                      className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
                      role="status"
                    >
                      {booking.status === 'IN_PROGRESS' ? 'Booking submitted!' : 'Booking confirmed!'} Cost: {booking.creditCost} credits.
                    </p>
                  )}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedResource(null); setAvailability(null); setBooking(null) }}
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60" disabled={loading} type="submit">
                      {loading ? 'Validating…' : 'Submit booking'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </section>}

      {error && !selectedResource && !editingBooking && <p aria-live="polite" className="mt-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}

      {/* ── Confirmation Modal (FR-5.1: Draft Review & Pricing Preview) ── */}
      {showConfirmModal && selectedResource && draftBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => void cancelDraft()}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => void cancelDraft()}
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close confirmation"
            >
              ✕
            </button>

            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-700 text-lg text-white">📋</span>
              <h3 className="text-xl font-semibold text-slate-900">Review & Confirm Booking</h3>
            </div>

            {isClashing && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm font-medium text-amber-900">
                <p>it clashes with the already booked slot, it may not get booked,</p>
              </div>
            )}

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Resource</span>
                <span className="font-semibold text-slate-900">{selectedResource.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-800">{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time Window</span>
                <span className="font-medium text-slate-800">{startTime} - {endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isClashing ? 'bg-amber-100 text-amber-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isClashing ? 'WILL BE IN_PROGRESS' : 'DRAFT (Unreserved)'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-500">Required Credits</span>
                <span className="text-base font-bold text-blue-700">{draftBooking.creditCost} Credits</span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {isClashing
                ? 'Because this time window overlaps with an already booked slot, confirming will submit your request with status IN_PROGRESS.'
                : 'Slots are not held and credits are not deducted while in draft. On confirmation, the slot will be locked and credits will be debited.'}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => void cancelDraft()}
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

      {/* ── Rejection Modal (FR-3.1: Rule Violation Notification) ── */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowRejectionModal(false)}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowRejectionModal(false)}
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close rejection notice"
            >
              ✕
            </button>

            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-red-100 text-xl text-red-600">⚠️</span>
              <h3 className="text-xl font-semibold text-slate-900">Cannot Book Resource</h3>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-medium">{rejectionModalReason || 'The booking request violates configured resource rules or constraints.'}</p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRejectionModal(false)}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Details Popup Modal ── */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedBookingDetails(null)}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedBookingDetails(null)}
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close details"
            >
              ✕
            </button>

            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-100 text-lg text-blue-700">🔎</span>
              <h3 className="text-xl font-semibold text-slate-900">Booking Details</h3>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Resource</span>
                <span className="font-semibold text-slate-900">
                  {selectedBookingDetails.resourceName || selectedBookingDetails.resourceId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-800">{selectedBookingDetails.startTime.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start Time</span>
                <span className="font-medium text-slate-800">{selectedBookingDetails.startTime.replace('T', ' ').slice(11, 16)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">End Time</span>
                <span className="font-medium text-slate-800">{selectedBookingDetails.endTime.replace('T', ' ').slice(11, 16)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  selectedBookingDetails.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedBookingDetails.status === 'DRAFT'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  {selectedBookingDetails.status}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-500">Credit Cost</span>
                <span className="font-bold text-blue-700">{selectedBookingDetails.creditCost} Credits</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Booking ID</span>
                <span className="font-mono">{selectedBookingDetails.id.slice(0, 8)}…</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBookingDetails(null)}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── My bookings Grouped by Date (FR-5.1 & US-5) ───────────── */}
      <section aria-label="My bookings" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900">My bookings</h2>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={loading}
            onClick={() => void loadBookings()}
            type="button"
          >
            Refresh bookings
          </button>
        </div>

        {memberBookings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No bookings found. Search above to book a resource.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {sortedDates.map((bookingDate) => (
              <div key={bookingDate} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="text-sm font-bold text-slate-700">📅 {bookingDate}</span>
                  <span className="text-xs text-slate-500">({bookingsByDate[bookingDate].length} session{bookingsByDate[bookingDate].length > 1 ? 's' : ''})</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-1">
                  {bookingsByDate[bookingDate].map((memberBooking) => (
                    <article
                      key={memberBooking.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center"
                    >
                      {/* Left side: Resource info & time */}
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {memberBooking.resourceName || `Resource: ${memberBooking.resourceId.slice(0, 8)}…`}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          ⏱ {memberBooking.startTime.replace('T', ' ').slice(11, 16)} - {memberBooking.endTime.replace('T', ' ').slice(11, 16)} · {memberBooking.creditCost} Credits
                        </p>
                      </div>

                      {/* Right side: Show Details link, Status badge & Actions */}
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <button
                          type="button"
                          onClick={() => setSelectedBookingDetails(memberBooking)}
                          className="text-xs font-semibold text-blue-700 underline hover:text-blue-900"
                        >
                          Show details
                        </button>

                        <div className="flex items-center gap-2">
                          {memberBooking.status === 'CONFIRMED' && (
                            <button
                              className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 transition hover:bg-blue-50"
                              onClick={() => {
                                setEditingBooking(memberBooking)
                                setEditStartTime(memberBooking.startTime.slice(0, 16))
                                setEditEndTime(memberBooking.endTime.slice(0, 16))
                                setError('')
                              }}
                              type="button"
                            >
                              Change time
                            </button>
                          )}
                          {['CONFIRMED', 'PENDING', 'PENDING_APPROVAL'].includes(memberBooking.status) && (
                            <button
                              className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-60"
                              disabled={loading}
                              onClick={() => void cancelBooking(memberBooking)}
                              type="button"
                            >
                              Cancel
                            </button>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                              memberBooking.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : memberBooking.status === 'PENDING' || memberBooking.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-100 text-amber-800'
                                : memberBooking.status === 'DRAFT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {memberBooking.status}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
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

      <AiAssistantDrawer
        isOpen={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
        currentDate={date}
        onSelectRecommendation={handleSelectRecommendation}
      />
    </section>
  )
}

function formatSlot(slot: TimeSlot) {
  const start = slot.startTime.slice(11, 16)
  let end = slot.endTime.slice(11, 16)
  if (end === '00:00' && slot.endTime.slice(0, 10) !== slot.startTime.slice(0, 10)) {
    end = '24:00'
  }
  return `${start} to ${end}`
}

const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100'
