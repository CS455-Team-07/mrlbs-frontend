import { useState, useEffect, useContext, useRef, useCallback, type FormEvent } from 'react'
import { apiClientConfig, csrfFetch, getCsrfToken } from '../services/apiClient'
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
  bookingRule?: {
    bookingPolicy?: string
    bufferTimeMinutes?: number | null
  }
}
interface TimeSlot { startTime: string; endTime: string }
interface Availability {
  bookedSlots: TimeSlot[]
  availableSlots: TimeSlot[]
  pendingApprovalSlots?: TimeSlot[]
}
interface BookingResult {
  id: string
  creditCost: number
  status: string
  clashes?: boolean
  waitlist?: boolean
  queuePosition?: number
  memberBalance?: number
}
interface WaitlistEntryItem {
  id: string
  resourceId: string
  resourceName: string
  resourceType: string
  startTime: string
  endTime: string
  status: 'IN_PROGRESS' | 'CONFIRMED' | 'CANCELLED' | string
  joinedAt: string
  leftAt?: string | null
  queuePosition?: number | null
  bookingId?: string | null
}
interface MemberBooking extends BookingResult {
  startTime: string
  endTime: string
  resourceId: string
  resourceName?: string
  memberId?: string
  rejectionReason?: string | null
}
interface WaitlistOfferItem {
  id: string
  waitlistEntryId: string
  resourceId: string
  resourceName: string
  resourceType: string
  startTime: string
  endTime: string
  creditCost: number
  status: string
  offeredAt: string
  expiresAt: string
  respondedAt?: string | null
  resultingBookingId?: string | null
}
interface InAppNotificationItem {
  id: string
  memberId: string
  title: string
  message: string
  offerId?: string | null
  isRead: boolean
  createdAt: string
}
interface ApiProblem { reasonCode?: string; detail?: string }

function getTodayDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return year + "-" + month + "-" + day;
}

function getNextHourTimeString(): string {
  const d = new Date()
  const nextHour = d.getHours() + 1
  if (nextHour >= 24) {
    return '23:59'
  }
  return String(nextHour).padStart(2, '0') + ":00";
}

function isCancellationWindowOpen(booking: MemberBooking): boolean {
  if (booking.status !== 'CONFIRMED') {
    return true
  }
  const startMs = new Date(booking.startTime).getTime()
  if (isNaN(startMs)) return true
  const twoHoursMs = 2 * 60 * 60 * 1000
  return (startMs - Date.now()) > twoHoursMs
}


export function MemberDashboard() {
  const auth = useContext(AuthContext)
  const user = auth?.user
  const [type, setType] = useState('')
  const [date, setDate] = useState('')
  const [searchStartTime, setSearchStartTime] = useState('')
  const [searchEndTime, setSearchEndTime] = useState('')
  const [capacity, setCapacity] = useState('')
  const todayDateString = getTodayDateString()
  const isToday = date === todayDateString
  const nextHourTimeString = getNextHourTimeString()
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
  const [memberCreditBalance, setMemberCreditBalance] = useState<number | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [rejectionModalReason, setRejectionModalReason] = useState<string | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<MemberBooking | null>(null)
  const [showAiAssistant, setShowAiAssistant] = useState(false)

  // Waitlist States
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntryItem[]>([])
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistError, setWaitlistError] = useState('')
  const [waitlistSuccess, setWaitlistSuccess] = useState('')
  const [leavingWaitlistId, setLeavingWaitlistId] = useState<string | null>(null)
  const [bookingSuccessNotice, setBookingSuccessNotice] = useState<string | null>(null)

  // Waitlist Offers & Notifications States
  const [activeOffers, setActiveOffers] = useState<WaitlistOfferItem[]>([])
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([])
  const [offersLoading, setOffersLoading] = useState(false)
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null)
  const [offerSuccessNotice, setOfferSuccessNotice] = useState<string | null>(null)
  const [offerErrorNotice, setOfferErrorNotice] = useState<string | null>(null)
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false)
  const [nowTimestamp, setNowTimestamp] = useState(Date.now())

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
      bookingRule: rec.bookingPolicy ? { bookingPolicy: rec.bookingPolicy } : undefined,
    }

    setResources((prev) => {
      const exists = prev.some((r) => r.id === rec.resourceId)
      return exists ? prev : [targetOpt, ...prev]
    })

    await chooseResource(targetOpt, chosenDate, formattedStart, formattedEnd)
  }

  const isClashing = Boolean(
    draftBooking?.waitlist ||
    draftBooking?.clashes ||
    (availability?.bookedSlots?.some((slot) => {
      const uStart = new Date(`${date}T${startTime}`).getTime()
      const uEnd = new Date(`${date}T${endTime}`).getTime()
      const sStart = new Date(slot.startTime).getTime()
      const sEnd = new Date(slot.endTime).getTime()
      return !isNaN(uStart) && !isNaN(uEnd) && !isNaN(sStart) && !isNaN(sEnd) && uStart < sEnd && uEnd > sStart
    }))
  )

  // Auto-sync member session and auto-load bookings and waitlist on mount
  useEffect(() => {
    async function initMemberSession() {
      if (user?.email) {
        try {
          const res = await csrfFetch(`${apiClientConfig.baseUrl}/auth/member-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, name: user.name }),
            credentials: 'include',
          })
          if (res.ok) {
            const data = (await res.json().catch(() => null)) as { creditsBalance?: number } | null
            if (data?.creditsBalance != null) {
              setMemberCreditBalance(Number(data.creditsBalance))
            }
          }
        } catch (e) {
          console.warn('Could not sync member session with backend', e)
        }
        void loadBookings()
        void loadWaitlists()
        void loadOffersAndNotifications()
      }
    }
    void initMemberSession()
  }, [user?.email, user?.name])

  // Real-time ticking timer for offer countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Periodic background sync for offers and notifications
  useEffect(() => {
    if (!user?.email) return
    const interval = setInterval(() => {
      void loadOffersAndNotifications()
    }, 8000)
    return () => clearInterval(interval)
  }, [user?.email])

  function getFriendlyErrorMessage(problem: ApiProblem | null): string {
    if (!problem) return 'The booking could not be processed.'
    if (problem.reasonCode === 'DUPLICATE_WAITLIST') {
      return problem.detail || 'You already have an active waitlist request for this resource and time slot.'
    }
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

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchCacheRef = useRef<Map<string, { data: ResourceOption[]; timestamp: number }>>(new Map())
  const isInitialMount = useRef(true)

  const performSearch = useCallback(async (
    targetType = type,
    targetDate = date,
    targetStart = searchStartTime,
    targetEnd = searchEndTime,
    targetCapacity = capacity
  ) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }
    const params = new URLSearchParams()
    if (targetType.trim()) params.set('type', targetType.trim())
    if (targetDate) params.set('date', targetDate)

    const effectiveDate = targetDate || ((targetStart || targetEnd) ? new Date().toISOString().split('T')[0] : '')
    if (effectiveDate && targetStart) {
      params.set('startTime', `${effectiveDate}T${targetStart}`)
    }
    if (effectiveDate && targetEnd) {
      params.set('endTime', `${effectiveDate}T${targetEnd}`)
    }
    if (targetCapacity) params.set('capacity', targetCapacity)

    const cacheKey = params.toString()
    const cached = searchCacheRef.current.get(cacheKey)
    const isFresh = cached && (Date.now() - cached.timestamp < 30000)

    if (isFresh) {
      setResources(cached.data)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    setSelectedResource(null)
    setAvailability(null)
    setBooking(null)
    try {
      const response = await fetch(`${apiClientConfig.baseUrl}/resources/search?${params}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Resources could not be loaded.')
      const results = (await response.json()) as ResourceOption[]
      searchCacheRef.current.set(cacheKey, { data: results, timestamp: Date.now() })
      setResources(results)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Resources could not be loaded.')
    } finally { setLoading(false) }
  }, [type, date, searchStartTime, searchEndTime, capacity])

  async function searchResources(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }
    await performSearch()
  }

  // Auto-search within 1 second whenever date or timings are entered
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (date || searchStartTime || searchEndTime) {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
      searchDebounceRef.current = setTimeout(() => {
        void performSearch(type, date, searchStartTime, searchEndTime, capacity)
      }, 150)
    }

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [date, searchStartTime, searchEndTime, type, capacity, performSearch])

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
    const effectiveDate = targetDate || date || todayDateString
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
      if (!resource.bookingRule) {
        try {
          const resDetail = await fetch(`${apiClientConfig.baseUrl}/resources/${resource.id}`, { credentials: 'include' })
          if (resDetail.ok) {
            const fullRes = await resDetail.json()
            if (fullRes?.bookingRule) {
              setSelectedResource((curr) => (curr?.id === resource.id ? { ...curr, bookingRule: fullRes.bookingRule } : curr))
            }
          }
        } catch {
          // ignore fallback error
        }
      }
    } catch (availabilityError) {
      setError(availabilityError instanceof Error ? availabilityError.message : 'Availability could not be loaded.')
    }
  }

  async function handleSubmitClick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedResource) return
    if (date === todayDateString) {
      const nextHour = getNextHourTimeString()
      if (startTime && startTime < nextHour) {
        setError("For today's bookings, start time must begin from the next hour (" + nextHour + ") onward.")
        return
      }
    }
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
          await csrfFetch(`${apiClientConfig.baseUrl}/auth/member-login`, {
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
      if (draft.memberBalance != null) {
        setMemberCreditBalance(Number(draft.memberBalance))
      }
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
          await csrfFetch(`${apiClientConfig.baseUrl}/auth/member-login`, {
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
      if (confirmed.memberBalance != null) {
        setMemberCreditBalance(Number(confirmed.memberBalance))
      }
      setBooking(confirmed)
      if (confirmed.status === 'PENDING_APPROVAL') {
        if (confirmed.clashes && confirmed.queuePosition) {
          setBookingSuccessNotice(`Booking submitted successfully! Waiting for approval. Expected queue position upon approval: #${confirmed.queuePosition}.`)
        } else {
          setBookingSuccessNotice('Booking submitted successfully! Waiting for approval.')
        }
      } else if (confirmed.waitlist || confirmed.status === 'IN_PROGRESS') {
        setBookingSuccessNotice(`Booking request submitted successfully. Queue position: ${confirmed.queuePosition || 1}`)
      } else {
        setBookingSuccessNotice(`Booking confirmed! Cost: ${confirmed.creditCost} credits.`)
      }
      setShowConfirmModal(false)
      setDraftBooking(null)
      void loadBookings()
      void loadWaitlists()
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
      const headers: Record<string, string> = {}
      if (user?.email) {
        headers['X-User-Email'] = user.email
      }
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings`, { credentials: 'include', headers })
      if (!response.ok) throw new Error('Your bookings could not be loaded.')
      const data = (await response.json().catch(() => null)) as unknown
      setMemberBookings(Array.isArray(data) ? (data as MemberBooking[]) : [])
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Your bookings could not be loaded.')
    } finally { setLoading(false) }
  }

  async function loadWaitlists() {
    setWaitlistLoading(true)
    setWaitlistError('')
    try {
      const headers: Record<string, string> = {}
      if (user?.email) {
        headers['X-User-Email'] = user.email
      }
      const response = await fetch(`${apiClientConfig.baseUrl}/waitlist`, {
        credentials: 'include',
        headers,
      })
      if (!response.ok) throw new Error('Your waitlist entries could not be loaded.')
      const data = (await response.json().catch(() => null)) as unknown
      setWaitlistEntries(Array.isArray(data) ? (data as WaitlistEntryItem[]) : [])
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : 'Your waitlist entries could not be loaded.')
    } finally {
      setWaitlistLoading(false)
    }
  }

  async function leaveWaitlist(entryId: string, resourceName?: string) {
    setLeavingWaitlistId(entryId)
    setWaitlistError('')
    setWaitlistSuccess('')
    try {
      const csrf = await getCsrfToken()
      const headers: Record<string, string> = { [csrf.headerName]: csrf.token }
      if (user?.email) {
        headers['X-User-Email'] = user.email
      }
      const response = await fetch(`${apiClientConfig.baseUrl}/waitlist/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as ApiProblem | null
        throw new Error(problem?.detail || 'Could not leave waitlist.')
      }
      setWaitlistSuccess(`Successfully left the waitlist for ${resourceName || 'the resource'}.`)
      void loadWaitlists()
      void loadBookings()
      void loadOffersAndNotifications()
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : 'Could not leave waitlist.')
    } finally {
      setLeavingWaitlistId(null)
    }
  }

  async function loadOffersAndNotifications() {
    if (!user?.email) return
    setOffersLoading(true)
    try {
      const headers: Record<string, string> = { 'X-User-Email': user.email }
      const [offersRes, notifsRes] = await Promise.all([
        fetch(`${apiClientConfig.baseUrl}/waitlist/offers`, { credentials: 'include', headers }),
        fetch(`${apiClientConfig.baseUrl}/waitlist/notifications`, { credentials: 'include', headers }),
      ])
      if (offersRes.ok) {
        const offersData = (await offersRes.json().catch(() => [])) as WaitlistOfferItem[]
        setActiveOffers(Array.isArray(offersData) ? offersData : [])
      }
      if (notifsRes.ok) {
        const notifsData = (await notifsRes.json().catch(() => [])) as InAppNotificationItem[]
        setNotifications(Array.isArray(notifsData) ? notifsData : [])
      }
    } catch (e) {
      console.warn('Could not load offers or notifications', e)
    } finally {
      setOffersLoading(false)
    }
  }

  async function handleAcceptOffer(offerId: string) {
    setOfferActionLoading(offerId)
    setOfferErrorNotice(null)
    setOfferSuccessNotice(null)
    try {
      const csrf = await getCsrfToken()
      const headers: Record<string, string> = {
        [csrf.headerName]: csrf.token,
      }
      if (user?.email) headers['X-User-Email'] = user.email

      const res = await fetch(`${apiClientConfig.baseUrl}/waitlist/offers/${offerId}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        const problem = (await res.json().catch(() => null)) as ApiProblem | null
        if (problem?.reasonCode === 'INSUFFICIENT_CREDITS' || problem?.detail?.toLowerCase().includes('credits')) {
          throw new Error('Insufficient credit balance: You do not have enough credits to confirm this offer. Please top up your account balance or decline the offer.')
        }
        throw new Error(problem?.detail || 'Failed to confirm booking.')
      }
      const data = (await res.json().catch(() => null)) as BookingResult | null
      if (data?.status === 'PENDING_APPROVAL') {
        setOfferSuccessNotice('Booking submitted successfully! Waiting for approval.')
      } else {
        setOfferSuccessNotice('Booking confirmed successfully! Your credits have been deducted.')
      }
      void loadOffersAndNotifications()
      void loadBookings()
      void loadWaitlists()
    } catch (err) {
      setOfferErrorNotice(err instanceof Error ? err.message : 'Failed to confirm booking.')
    } finally {
      setOfferActionLoading(null)
    }
  }

  async function handleDeclineOffer(offerId: string) {
    setOfferActionLoading(offerId)
    setOfferErrorNotice(null)
    setOfferSuccessNotice(null)
    try {
      const csrf = await getCsrfToken()
      const headers: Record<string, string> = {
        [csrf.headerName]: csrf.token,
      }
      if (user?.email) headers['X-User-Email'] = user.email

      const res = await fetch(`${apiClientConfig.baseUrl}/waitlist/offers/${offerId}/decline`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        const problem = (await res.json().catch(() => null)) as ApiProblem | null
        throw new Error(problem?.detail || 'Failed to decline offer.')
      }
      setOfferSuccessNotice('Offer declined. Your waitlist entry has been updated.')
      void loadOffersAndNotifications()
      void loadWaitlists()
      void loadBookings()
    } catch (err) {
      setOfferErrorNotice(err instanceof Error ? err.message : 'Failed to decline offer.')
    } finally {
      setOfferActionLoading(null)
    }
  }

  async function markNotificationAsRead(id: string) {
    try {
      const csrf = await getCsrfToken()
      const headers: Record<string, string> = {
        [csrf.headerName]: csrf.token,
      }
      if (user?.email) headers['X-User-Email'] = user.email

      await fetch(`${apiClientConfig.baseUrl}/waitlist/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch (e) {
      console.warn('Could not mark notification as read', e)
    }
  }

  function getOfferRemainingSeconds(expiresAtStr: string) {
    const expiresAt = new Date(expiresAtStr).getTime()
    return Math.max(0, Math.floor((expiresAt - nowTimestamp) / 1000))
  }

  function formatCountdown(seconds: number) {
    if (seconds <= 0) return 'Expired'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s < 10 ? '0' : ''}${s}s`
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
    if (memberBooking.status === 'CONFIRMED' && !isCancellationWindowOpen(memberBooking)) {
      setError('Confirmed bookings cannot be cancelled within 2 hours of the scheduled start time.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const csrf = await getCsrfToken()
      const headers: Record<string, string> = { [csrf.headerName]: csrf.token }
      if (user?.email) {
        headers['X-User-Email'] = user.email
      }
      const response = await fetch(`${apiClientConfig.baseUrl}/bookings/${memberBooking.id}`, {
        method: 'DELETE', credentials: 'include', headers,
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
      void loadWaitlists()
    } catch (cancellationError) {
      setError(cancellationError instanceof Error ? cancellationError.message : 'The booking could not be cancelled.')
    } finally { setLoading(false) }
  }

  const isExpanded = (resourceId: string) => selectedResource?.id === resourceId

  // Group bookings by date
  const bookingsByDate: Record<string, MemberBooking[]> = {}
    ; (Array.isArray(memberBookings) ? memberBookings : []).forEach((b) => {
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
        <div className="flex items-center gap-3">
          {/* In-app Notification Toggle Button */}
          <button
            type="button"
            onClick={() => setShowNotificationsDrawer(true)}
            className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            title="In-app Notifications"
          >
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Notifications</span>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white">
                {notifications.filter((n) => !n.isRead).length}
              </span>
            )}
          </button>

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
        </div>
      </header>

      {/* ── Search form ────────────────────────────────────────────── */}
      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3 lg:grid-cols-6" onSubmit={searchResources}>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Type
          <input className={inputClassName} onChange={(event) => setType(event.target.value)} placeholder="e.g. Lecture Hall" value={type} />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Date
          <input
            className={inputClassName}
            min={todayDateString}
            onChange={(event) => {
              const val = event.target.value
              if (!val || val >= todayDateString) {
                setDate(val)
                if (val === todayDateString && searchStartTime && searchStartTime < nextHourTimeString) {
                  setSearchStartTime(nextHourTimeString)
                }
              }
            }}
            type="date"
            value={date}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-800">Start time (optional)
          <input
            className={inputClassName}
            onChange={(event) => {
              const val = event.target.value
              if (isToday && val && val < nextHourTimeString) {
                setSearchStartTime(nextHourTimeString)
              } else {
                setSearchStartTime(val)
              }
            }}
            min={isToday ? nextHourTimeString : undefined}
            type="time"
            value={searchStartTime}
          />
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
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition ${isExpanded(resource.id)
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
                  {` · Buffer: ${resource.bookingRule?.bufferTimeMinutes ?? 15} mins`}
                </p>
              </div>
              {/* Status badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${resource.available
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

                    {/* Pending admin approval slots */}
                    {selectedResource?.bookingRule?.bookingPolicy === 'APPROVAL_REQUIRED' &&
                      availability.pendingApprovalSlots &&
                      availability.pendingApprovalSlots.length > 0 && (
                        <>
                          <div className="mb-2 flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-amber-800">Pending admin approval</h4>
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                              Awaiting Review
                            </span>
                          </div>
                          <ul className="mb-5 list-inside list-disc text-sm text-amber-700">
                            {availability.pendingApprovalSlots.map((slot) => (
                              <li key={`pending-${slot.startTime}-${slot.endTime}`}>
                                {formatSlot(slot)} <span className="text-xs text-amber-600">(decision pending)</span>
                              </li>
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
                      <input
                        className={inputClassName}
                        onChange={(event) => setStartTime(event.target.value)}
                        required
                        type="time"
                        value={startTime}
                        min={isToday ? nextHourTimeString : undefined}
                      />
                    </label>
                    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                      End time
                      <input
                        className={inputClassName}
                        onChange={(event) => setEndTime(event.target.value)}
                        required
                        type="time"
                        value={endTime}
                        min={startTime || (isToday ? nextHourTimeString : undefined)}
                      />
                    </label>
                  </div>
                  {error && <p aria-live="polite" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{error}</p>}
                  {booking && (
                    <p
                      aria-live="polite"
                      className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
                      role="status"
                    >
                      {bookingSuccessNotice || (booking.status === 'PENDING_APPROVAL'
                        ? (booking.clashes && booking.queuePosition
                          ? `Booking submitted successfully! Waiting for approval. Expected queue position upon approval: #${booking.queuePosition}.`
                          : 'Booking submitted successfully! Waiting for approval.')
                        : (booking.waitlist || booking.status === 'IN_PROGRESS'
                          ? `Booking request submitted successfully. Queue position: ${booking.queuePosition || 1}`
                          : `Booking confirmed! Cost: ${booking.creditCost} credits.`))}
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
              <span className={`grid size-10 place-items-center rounded-xl text-lg text-white ${isClashing ? 'bg-amber-600' : 'bg-blue-700'}`}>
                {isClashing ? '⏳' : '📋'}
              </span>
              <h3 className="text-xl font-semibold text-slate-900">
                {isClashing ? 'Slot Unavailable — Join Waitlist' : 'Review & Confirm Booking'}
              </h3>
            </div>

            {selectedResource.bookingRule?.bookingPolicy === 'APPROVAL_REQUIRED' && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                  <span>⚠️</span> Consideration for Pending Admin Approval Slots
                </p>
                <p className="text-amber-900 leading-relaxed">
                  Please consider the pending admin approval slots and select accordingly without slot conflict and buffer time ({selectedResource.bookingRule?.bufferTimeMinutes ?? 15} mins) violation. If you still want to select this slot, you can proceed and confirm your booking request below.
                </p>
              </div>
            )}

            {isClashing && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-1">
                <p className="font-semibold">This slot is currently unavailable.</p>
                <p className="text-amber-900">
                  {selectedResource.bookingRule?.bookingPolicy === 'APPROVAL_REQUIRED'
                    ? 'The requested time slot is occupied by an existing booking. This resource requires administrator approval. If approved, you will join the waitlist at the expected queue position.'
                    : 'The requested time slot is occupied by an existing booking. Would you like to join the waitlist for this slot?'}
                </p>
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
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${selectedResource.bookingRule?.bookingPolicy === 'APPROVAL_REQUIRED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : isClashing
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                  }`}>
                  {selectedResource.bookingRule?.bookingPolicy === 'APPROVAL_REQUIRED'
                    ? 'PENDING_APPROVAL'
                    : isClashing
                      ? 'WAITLIST (IN_PROGRESS)'
                      : 'DRAFT (Unreserved)'}
                </span>
              </div>
              {isClashing && (
                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="text-slate-500">
                    {selectedResource.bookingRule?.bookingPolicy === 'APPROVAL_REQUIRED' ? 'Expected Queue Position' : 'Queue Position'}
                  </span>
                  <span className="font-bold text-amber-900">
                    #{draftBooking.queuePosition || 1} in queue
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1 border-t border-slate-200 pt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Required Credits</span>
                  <span className="text-base font-bold text-blue-700">
                    {draftBooking.creditCost} Credits
                  </span>
                </div>
                {selectedResource.bookingRule?.bookingPolicy === 'APPROVAL_REQUIRED' && (
                  <span className="text-xs text-slate-500 text-right">
                    (the required credits may be more than this based on the contention at the time of admin approval)
                  </span>
                )}
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-500">Current Member Balance</span>
                <span className="text-base font-bold text-emerald-700">
                  {draftBooking.memberBalance ?? memberCreditBalance ?? 0} Credits
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {selectedResource.bookingRule?.bookingPolicy === 'APPROVAL_REQUIRED'
                ? (isClashing
                  ? `This resource requires approval and clashes with an existing booking. Your request will be submitted as PENDING_APPROVAL with expected queue position #${draftBooking.queuePosition || 1} upon approval.`
                  : 'This resource requires approval. Your request will be submitted and marked as pending approval.')
                : isClashing
                  ? `${draftBooking.creditCost} credits will be deducted upon joining the waitlist (IN_PROGRESS). If cancelled, your credits will be fully refunded.`
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
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${selectedBookingDetails.status === 'CONFIRMED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : selectedBookingDetails.status === 'DRAFT'
                    ? 'bg-amber-100 text-amber-800'
                    : selectedBookingDetails.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                  {selectedBookingDetails.status}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-500">Credit Cost</span>
                <span className="font-bold text-blue-700">{selectedBookingDetails.creditCost} Credits</span>
              </div>
              {selectedBookingDetails.rejectionReason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 space-y-1">
                  <span className="font-bold block">Rejection Reason:</span>
                  <p className="leading-relaxed">{selectedBookingDetails.rejectionReason}</p>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-500">
                <span>Member ID</span>
                <span className="font-mono">{selectedBookingDetails.memberId || 'N/A'}</span>
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

      {/* ── Active Waitlist Offers Section (Phase 3: Offers & Notifications) ────── */}
      {activeOffers.length > 0 && (
        <section aria-label="Waitlist offers" className="mt-8 rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/50 p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Waitlist Offers — Slot Available!</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  A requested slot has been released. Confirm your booking before the offer expires.
                </p>
              </div>
            </div>
            <button
              className="self-start sm:self-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              disabled={offersLoading}
              onClick={() => void loadOffersAndNotifications()}
              type="button"
            >
              {offersLoading ? 'Refreshing…' : 'Refresh offers'}
            </button>
          </div>

          {/* Feedback alerts */}
          {offerSuccessNotice && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-100/70 p-3 text-sm font-semibold text-emerald-900">
              <span>{offerSuccessNotice}</span>
              <button
                type="button"
                onClick={() => setOfferSuccessNotice(null)}
                className="text-emerald-800 hover:text-emerald-950 text-xs font-bold ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {offerErrorNotice && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
              <span>{offerErrorNotice}</span>
              <button
                type="button"
                onClick={() => setOfferErrorNotice(null)}
                className="text-rose-800 hover:text-rose-950 text-xs font-bold ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {activeOffers.map((offer) => {
              const secondsLeft = getOfferRemainingSeconds(offer.expiresAt)
              const isExpired = secondsLeft <= 0
              const isProcessing = offerActionLoading === offer.id

              return (
                <div
                  key={offer.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm transition sm:flex-row sm:items-center"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                        {offer.resourceType || 'Resource'}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">{offer.resourceName}</h3>
                    </div>

                    <p className="text-sm text-slate-700 font-medium">
                      📅 Date: {offer.startTime.slice(0, 10)} · ⏱ Time: {offer.startTime.replace('T', ' ').slice(11, 16)} - {offer.endTime.replace('T', ' ').slice(11, 16)}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700 border border-blue-200">
                        💰 Preserved Cost: {offer.creditCost} Credits (Locked)
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-bold border ${isExpired
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : secondsLeft < 60
                            ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                        ⏳ {isExpired ? 'Offer Expired' : `Expires in: ${formatCountdown(secondsLeft)}`}
                      </span>
                      <span className="text-slate-400">
                        Expires at: {offer.expiresAt.replace('T', ' ').slice(11, 19)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 sm:pt-0">
                    <button
                      type="button"
                      disabled={isExpired || isProcessing}
                      onClick={() => void handleAcceptOffer(offer.id)}
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isProcessing ? 'Processing…' : 'Confirm Booking'}
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => void handleDeclineOffer(offer.id)}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── My Waitlist Section (Phase 1: Waitlist Management) ────── */}
      <section aria-label="My waitlist" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">My waitlist requests</h2>
            {waitlistEntries.filter((e) => e.status === 'IN_PROGRESS').length > 0 && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {waitlistEntries.filter((e) => e.status === 'IN_PROGRESS').length} active
              </span>
            )}
          </div>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={waitlistLoading}
            onClick={() => void loadWaitlists()}
            type="button"
          >
            {waitlistLoading ? 'Refreshing…' : 'Refresh waitlist'}
          </button>
        </div>

        {/* Feedback alerts */}
        {waitlistSuccess && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800">
            <span>{waitlistSuccess}</span>
            <button
              type="button"
              onClick={() => setWaitlistSuccess('')}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {waitlistError && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800">
            <span>{waitlistError}</span>
            <button
              type="button"
              onClick={() => setWaitlistError('')}
              className="text-red-700 hover:text-red-900 text-xs font-semibold ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {waitlistLoading && waitlistEntries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Loading waitlist entries…</p>
        ) : waitlistEntries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            You have no waitlist requests. When a requested resource slot is fully booked, you can join its waitlist.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {waitlistEntries.map((entry) => {
              const isActive = entry.status === 'IN_PROGRESS'
              const isAllocated = entry.status === 'CONFIRMED'
              const isLeft = entry.status === 'CANCELLED'

              return (
                <article
                  key={entry.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center"
                >
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {entry.resourceName || `Resource: ${entry.resourceId.slice(0, 8)}…`}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      📅 {entry.startTime.slice(0, 10)} · ⏱ {entry.startTime.replace('T', ' ').slice(11, 16)} - {entry.endTime.replace('T', ' ').slice(11, 16)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Joined: {entry.joinedAt ? entry.joinedAt.replace('T', ' ').slice(0, 16) : 'N/A'}
                      {entry.leftAt && ` · Left: ${entry.leftAt.replace('T', ' ').slice(0, 16)}`}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="flex items-center gap-2">
                      {isActive && entry.queuePosition != null && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                          Queue position: {entry.queuePosition}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${isActive
                            ? 'bg-amber-100 text-amber-800'
                            : isAllocated
                              ? 'bg-emerald-100 text-emerald-800'
                              : isLeft
                                ? 'border border-slate-200 bg-slate-100 text-slate-600'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                      >
                        {isActive ? 'WAITING' : isAllocated ? 'ALLOCATED' : entry.status}
                      </span>
                      {isActive && (
                        <button
                          type="button"
                          onClick={() => void leaveWaitlist(entry.id, entry.resourceName)}
                          disabled={leavingWaitlistId === entry.id}
                          className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          {leavingWaitlistId === entry.id ? 'Leaving…' : 'Leave waitlist'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

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
                        {memberBooking.memberId && (
                          <p className="text-xs text-slate-500">Member ID: {memberBooking.memberId}</p>
                        )}

                        <p className="mt-1 text-sm text-slate-600">
                          ⏱ {memberBooking.startTime.replace('T', ' ').slice(11, 16)} - {memberBooking.endTime.replace('T', ' ').slice(11, 16)} · {memberBooking.creditCost} Credits
                        </p>
                        {memberBooking.rejectionReason && (
                          <p className="mt-1 text-xs text-rose-600 font-medium">
                            Rejection reason: {memberBooking.rejectionReason}
                          </p>
                        )}
                        <span className="sr-only">
                          {memberBooking.startTime.slice(0, 10)} {memberBooking.startTime.replace('T', ' ').slice(11, 16)} to {memberBooking.endTime.slice(0, 10)} {memberBooking.endTime.replace('T', ' ').slice(11, 16)} {memberBooking.status} · {memberBooking.creditCost} credits
                        </span>
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
                          {['CONFIRMED', 'PENDING', 'PENDING_APPROVAL'].includes(memberBooking.status) && (
                            isCancellationWindowOpen(memberBooking) ? (
                              <button
                                className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-60"
                                disabled={loading}
                                onClick={() => void cancelBooking(memberBooking)}
                                type="button"
                                aria-label="Cancel booking"
                              >
                                Cancel
                              </button>
                            ) : memberBooking.status === 'CONFIRMED' ? (
                              <span
                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400"
                                title="Confirmed bookings cannot be cancelled within 2 hours of the scheduled start time"
                              >
                                Cancellation closed (&lt;2h)
                              </span>
                            ) : null
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${memberBooking.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : memberBooking.status === 'CANCELLED'
                                ? 'border border-red-200 bg-red-50 text-red-700'
                                : memberBooking.status === 'REJECTED'
                                  ? 'border border-rose-200 bg-rose-50 text-rose-700'
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
                <input className={inputClassName} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setEditStartTime(event.target.value)} required type="datetime-local" value={editStartTime} />
              </label>
              <label className="space-y-2 text-sm font-semibold text-slate-800">
                New end time
                <input className={inputClassName} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setEditEndTime(event.target.value)} required type="datetime-local" value={editEndTime} />
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

      {/* ── In-App Notifications Drawer (Phase 3) ─────────────────── */}
      {showNotificationsDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-slide-left">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
                {notifications.filter((n) => !n.isRead).length > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                    {notifications.filter((n) => !n.isRead).length} new
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationsDrawer(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm">You have no notifications right now.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <article
                    key={notif.id}
                    className={`rounded-xl border p-4 transition ${notif.isRead
                        ? 'border-slate-200 bg-slate-50/50 text-slate-700'
                        : 'border-blue-200 bg-blue-50/60 shadow-sm text-slate-900'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold">{notif.title}</h4>
                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 mt-1 flex-shrink-0" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{notif.createdAt ? notif.createdAt.replace('T', ' ').slice(0, 16) : ''}</span>
                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => void markNotificationAsRead(notif.id)}
                          className="font-semibold text-blue-700 hover:text-blue-900"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
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
