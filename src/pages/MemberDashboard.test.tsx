import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemberDashboard } from './MemberDashboard'

const resource = {
  id: '0d415dd5-d10e-4e7e-b809-75e84bddf5ed', name: 'Microscope 4', type: 'Microscope',
  location: 'Science Block, Room 12', capacity: 8, available: true, bookingRule: { bookingPolicy: 'OPEN' },
}
const availability = {
  bookedSlots: [{ startTime: '2030-05-01T10:00:00', endTime: '2030-05-01T11:00:00' }],
  availableSlots: [{ startTime: '2030-05-01T11:00:00', endTime: '2030-05-01T12:00:00' }],
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function searchAndChoose(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Type'), 'Microscope')
  await user.type(screen.getByLabelText('Date'), '2030-05-01')
  await user.type(screen.getByLabelText('Minimum capacity'), '4')
  await user.click(screen.getByRole('button', { name: 'Search resources' }))
  await screen.findByRole('heading', { name: 'Microscope 4' })
  await user.click(screen.getByRole('button', { name: /Microscope 4/ }))
  await screen.findByRole('heading', { name: 'Open slots' })
}

describe('member resource discovery and booking', () => {
  it('searches by type/date/capacity, shows booked and open times, and submits the selected slot', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [resource] })
      .mockResolvedValueOnce({ ok: true, json: async () => availability })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValue({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'b-1', creditCost: 4, status: 'DRAFT' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'b-1', creditCost: 4, status: 'CONFIRMED' }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await searchAndChoose(user)
    expect(screen.getByText(/Already booked/)).toBeInTheDocument()
    expect(screen.getByText(/10:00 to 11:00/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^11:00 to 12:00$/ }))
    expect(screen.getByLabelText('Start time')).toHaveValue('11:00')
    expect(screen.getByLabelText('End time')).toHaveValue('12:00')
    await user.click(screen.getByRole('button', { name: 'Submit booking' }))

    await screen.findByRole('heading', { name: 'Review & Confirm Booking' })
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Cost: 4 credits.')
    expect(String(fetchMock.mock.calls[3][0])).toContain('/bookings/draft')
    expect(String(fetchMock.mock.calls[4][0])).toContain('/bookings/b-1/confirm')
    const searchCall = fetchMock.mock.calls[0]
    expect(String(searchCall[0])).toContain('/resources/search?type=Microscope&date=2030-05-01&capacity=4')
    expect(String(fetchMock.mock.calls[1][0])).toContain(`/resources/${resource.id}/availability?date=2030-05-01`)
    expect(fetchMock.mock.calls[3][1]).toMatchObject({
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf' },
    })
    expect(JSON.parse(fetchMock.mock.calls[3][1].body as string)).toEqual({
      resourceId: resource.id, startTime: '2030-05-01T11:00', endTime: '2030-05-01T12:00',
    })
  })

  it('shows a specific insufficient-credit rejection for the selected resource', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [resource] })
      .mockResolvedValueOnce({ ok: true, json: async () => availability })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ reasonCode: 'INSUFFICIENT_CREDITS' }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await searchAndChoose(user)
    await user.type(screen.getByLabelText('Start time'), '11:00')
    await user.type(screen.getByLabelText('End time'), '12:00')
    await user.click(screen.getByRole('button', { name: 'Submit booking' }))

    expect(await screen.findByText(/not have enough credits/i)).toBeInTheDocument()
  })

  it('explains when a selected slot is taken by a concurrent booking', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [resource] })
      .mockResolvedValueOnce({ ok: true, json: async () => availability })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ reasonCode: 'SLOT_NO_LONGER_AVAILABLE' }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await searchAndChoose(user)
    await user.type(screen.getByLabelText('Start time'), '11:00')
    await user.type(screen.getByLabelText('End time'), '12:00')
    await user.click(screen.getByRole('button', { name: 'Submit booking' }))

    expect(await screen.findByText(/this slot is no longer available/i)).toBeInTheDocument()
  })

  it('loads the member booking history and updates a time window after a successful modification', async () => {
    const existing = { id: 'booking-1', resourceId: resource.id, startTime: '2030-05-02T10:00:00', endTime: '2030-05-02T11:00:00', status: 'CONFIRMED', creditCost: 4 }
    const updated = { ...existing, startTime: '2030-05-02T12:00:00', endTime: '2030-05-02T13:00:00' }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [existing] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => updated })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await user.click(screen.getByRole('button', { name: 'Refresh bookings' }))
    await screen.findByText(/10:00 - 11:00/)
    await user.click(screen.getByRole('button', { name: 'Change time' }))
    await user.clear(screen.getByLabelText('New start time'))
    await user.type(screen.getByLabelText('New start time'), '2030-05-02T12:00')
    await user.clear(screen.getByLabelText('New end time'))
    await user.type(screen.getByLabelText('New end time'), '2030-05-02T13:00')
    await user.click(screen.getByRole('button', { name: 'Save new time' }))

    expect(await screen.findByText(/12:00 - 13:00/)).toBeInTheDocument()
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'PUT', credentials: 'include' })
    expect(String(fetchMock.mock.calls[2][0])).toContain('/bookings/booking-1/time-window')
    expect(JSON.parse(fetchMock.mock.calls[2][1].body as string)).toEqual({
      startTime: '2030-05-02T12:00', endTime: '2030-05-02T13:00',
    })
  })

  it('keeps the original displayed booking when its replacement slot is unavailable', async () => {
    const existing = { id: 'booking-1', resourceId: resource.id, startTime: '2030-05-02T10:00:00', endTime: '2030-05-02T11:00:00', status: 'CONFIRMED', creditCost: 4 }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [existing] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ reasonCode: 'SLOT_NO_LONGER_AVAILABLE' }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await user.click(screen.getByRole('button', { name: 'Refresh bookings' }))
    await screen.findByText(/10:00 - 11:00/)
    await user.click(screen.getByRole('button', { name: 'Change time' }))
    await user.clear(screen.getByLabelText('New start time'))
    await user.type(screen.getByLabelText('New start time'), '2030-05-02T12:00')
    await user.clear(screen.getByLabelText('New end time'))
    await user.type(screen.getByLabelText('New end time'), '2030-05-02T13:00')
    await user.click(screen.getByRole('button', { name: 'Save new time' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This slot is no longer available.')
    expect(screen.getByText(/10:00 - 11:00/)).toBeInTheDocument()
  })

  it('cancels an upcoming booking with CSRF protection and refreshes its status', async () => {
    const existing = { id: 'booking-1', resourceId: resource.id, startTime: '2030-05-02T10:00:00', endTime: '2030-05-02T11:00:00', status: 'CONFIRMED', creditCost: 4 }
    const cancelled = { ...existing, status: 'CANCELLED' }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [existing] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => cancelled })
      .mockResolvedValueOnce({ ok: true, json: async () => [cancelled] })
      .mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await user.click(screen.getByRole('button', { name: 'Refresh bookings' }))
    await screen.findByText(/10:00 - 11:00/)
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))

    expect(await screen.findByText('CANCELLED')).toBeInTheDocument()
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-TOKEN': 'csrf' },
    })
    expect(String(fetchMock.mock.calls[2][0])).toContain('/bookings/booking-1')
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })

  it('keeps the booking active when the server rejects cancellation after its start', async () => {
    const existing = { id: 'booking-1', resourceId: resource.id, startTime: '2030-05-02T10:00:00', endTime: '2030-05-02T11:00:00', status: 'CONFIRMED', creditCost: 4 }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [existing] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ reasonCode: 'BOOKING_NOT_MODIFIABLE' }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await user.click(screen.getByRole('button', { name: 'Refresh bookings' }))
    await screen.findByText(/10:00 - 11:00/)
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This booking can no longer be cancelled')
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument()
  })
})
