import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemberDashboard } from './MemberDashboard'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MemberDashboard Booking Details and Rejection Display', () => {
  it('displays the saved rejection reason in the Show details modal when a booking is rejected', async () => {
    const rejectedBooking = {
      id: 'b-rej-999',
      resourceId: 'res-1',
      resourceName: 'Clean Room Alpha',
      startTime: '2030-05-02T10:00:00',
      endTime: '2030-05-02T11:00:00',
      status: 'REJECTED',
      creditCost: 0,
      memberId: 'm-123',
      rejectionReason: 'Exceeds department allocated safety limits.',
    }

    const fetchMock = vi.fn((url: string) => {
      const urlStr = String(url)
      if (urlStr.includes('/waitlist/offers')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/waitlist/notifications')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/waitlist')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/bookings')) {
        return Promise.resolve({ ok: true, json: async () => [rejectedBooking] })
      }
      return Promise.resolve({ ok: true, json: async () => [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)

    // Load bookings
    await user.click(screen.getByRole('button', { name: 'Refresh bookings' }))

    // Card should be present with REJECTED status and rejection reason summary
    await screen.findByText('Clean Room Alpha')
    expect(screen.getByText('REJECTED')).toBeInTheDocument()
    expect(screen.getByText(/Rejection reason: Exceeds department allocated safety limits/)).toBeInTheDocument()

    // Click "Show details"
    const detailsBtn = screen.getByRole('button', { name: 'Show details' })
    await user.click(detailsBtn)

    // The modal should display details and the complete rejection reason
    await screen.findByRole('heading', { name: 'Booking Details' })
    expect(screen.getByText('Exceeds department allocated safety limits.')).toBeInTheDocument()

    // Close the details modal
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('heading', { name: 'Booking Details' })).not.toBeInTheDocument()
  })
})
