import { apiClientConfig, csrfFetch } from './apiClient'
import type { BookingApproval, BookingStatusEvent } from '../types/BookingApproval'

const bookingsUrl = `${apiClientConfig.baseUrl}/bookings`

async function readError(response: Response, fallback: string): Promise<never> {
  const message = await response.text()
  throw new Error(message || fallback)
}

export async function getPendingApprovals(): Promise<BookingApproval[]> {
  const response = await fetch(`${bookingsUrl}/pending-approval`, { credentials: 'include' })
  if (!response.ok) return readError(response, 'Could not load approval requests.')
  return (await response.json()) as BookingApproval[]
}

export async function decideBookingApproval(
  bookingId: string,
  decision: 'approve' | 'reject',
): Promise<BookingApproval> {
  const response = await csrfFetch(`${bookingsUrl}/${bookingId}/${decision}`, {
    method: 'POST',
  })
  if (!response.ok) return readError(response, `Could not ${decision} this request.`)
  return (await response.json()) as BookingApproval
}

export async function getBookingStatusHistory(bookingId: string): Promise<BookingStatusEvent[]> {
  const response = await fetch(`${bookingsUrl}/${bookingId}/status-history`, {
    credentials: 'include',
  })
  if (!response.ok) return readError(response, 'Could not load booking history.')
  return (await response.json()) as BookingStatusEvent[]
}
