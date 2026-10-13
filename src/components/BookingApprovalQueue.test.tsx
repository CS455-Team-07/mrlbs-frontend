import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BookingApprovalQueue } from './BookingApprovalQueue'
import * as approvalService from '../services/bookingApprovalService'
import type { BookingApproval, BookingStatusEvent } from '../types/BookingApproval'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const pendingBooking: BookingApproval = {
  id: 'booking-1',
  resourceId: 'resource-1',
  resourceName: 'GPU H100',
  startTime: '2026-10-20T10:00:00',
  endTime: '2026-10-20T11:00:00',
  status: 'PENDING_APPROVAL',
  creditCost: 4,
}

describe('BookingApprovalQueue', () => {
  it('lists pending requests and removes one after the admin approves it', async () => {
    const user = userEvent.setup()
    const list = vi.spyOn(approvalService, 'getPendingApprovals')
      .mockResolvedValueOnce([pendingBooking])
      .mockResolvedValueOnce([])
    const decide = vi.spyOn(approvalService, 'decideBookingApproval').mockResolvedValue({
      ...pendingBooking,
      status: 'CONFIRMED',
    })

    render(<BookingApprovalQueue />)

    expect(await screen.findByText('GPU H100')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    expect(decide).toHaveBeenCalledWith('booking-1', 'approve')
    expect(await screen.findByText(/no booking requests waiting/i)).toBeInTheDocument()
  })

  it('shows durable status history for a pending request', async () => {
    const user = userEvent.setup()
    const event: BookingStatusEvent = {
      id: 'event-1',
      bookingId: pendingBooking.id,
      fromStatus: null,
      toStatus: 'PENDING_APPROVAL',
      actorEmail: 'member@iitk.ac.in',
      occurredAt: '2026-10-19T12:00:00',
      note: null,
    }
    vi.spyOn(approvalService, 'getPendingApprovals').mockResolvedValue([pendingBooking])
    const getHistory = vi.spyOn(approvalService, 'getBookingStatusHistory').mockResolvedValue([event])

    render(<BookingApprovalQueue />)
    await screen.findByText('GPU H100')
    await user.click(screen.getByRole('button', { name: 'Audit history' }))

    expect(await screen.findByText('Submitted → PENDING_APPROVAL')).toBeInTheDocument()
    expect(screen.getByText(/member@iitk.ac.in/)).toBeInTheDocument()
    expect(getHistory).toHaveBeenCalledWith('booking-1')
  })

  it('sends a rejection decision for the selected request', async () => {
    const user = userEvent.setup()
    vi.spyOn(approvalService, 'getPendingApprovals').mockResolvedValue([pendingBooking])
    const decide = vi.spyOn(approvalService, 'decideBookingApproval').mockResolvedValue({
      ...pendingBooking,
      status: 'REJECTED',
    })

    render(<BookingApprovalQueue />)
    await screen.findByText('GPU H100')
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => expect(decide).toHaveBeenCalledWith('booking-1', 'reject'))
  })
})
