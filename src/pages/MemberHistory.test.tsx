import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { MemberHistory } from './MemberHistory'

const mockUser = {
  id: 'member-1',
  name: 'Test Member',
  email: 'member@iitk.ac.in',
  role: 'member',
}

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}))

describe('MemberHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading state initially and then shows upcoming and past bookings', async () => {
    const mockBookings = [
      {
        id: 'b-1',
        resourceId: 'res-1',
        resourceName: 'Advanced Computing Lab',
        startTime: '2030-01-01T10:00:00',
        endTime: '2030-01-01T12:00:00',
        status: 'CONFIRMED',
        creditCost: 8,
        memberId: 'member-1',
      },
      {
        id: 'b-2',
        resourceId: 'res-2',
        resourceName: 'Physics Laser Bench',
        startTime: '2020-01-01T09:00:00',
        endTime: '2020-01-01T10:30:00',
        status: 'COMPLETED',
        creditCost: 6,
        memberId: 'member-1',
      },
    ]

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookings,
    } as Response)

    render(
      <MemoryRouter>
        <MemberHistory />
      </MemoryRouter>
    )

    expect(screen.getByText(/loading your bookings/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Advanced Computing Lab')).toBeInTheDocument()
      expect(screen.getByText('Physics Laser Bench')).toBeInTheDocument()
    })

    expect(screen.getByText('Current & Upcoming Bookings')).toBeInTheDocument()
    expect(screen.getByText('Past Bookings')).toBeInTheDocument()
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument()
    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    expect(screen.getByText('2h')).toBeInTheDocument()
    expect(screen.getByText('1h 30m')).toBeInTheDocument()
  })

  it('handles empty states gracefully', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    render(
      <MemoryRouter>
        <MemberHistory />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/no current or upcoming bookings/i)).toBeInTheDocument()
      expect(screen.getByText(/no past bookings found/i)).toBeInTheDocument()
    })
  })

  it('displays error message when request fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    render(
      <MemoryRouter>
        <MemberHistory />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/failed to load booking history/i)).toBeInTheDocument()
    })
  })
})
