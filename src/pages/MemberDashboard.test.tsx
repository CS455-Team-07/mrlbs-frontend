import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemberDashboard } from './MemberDashboard'

const resource = {
  id: '0d415dd5-d10e-4e7e-b809-75e84bddf5ed', name: 'Microscope 4', type: 'Microscope',
  location: 'Science Block, Room 12', capacity: 8, available: true,
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
  await user.click(screen.getByRole('button', { name: 'View availability' }))
  await screen.findByRole('heading', { name: 'Microscope 4 availability' })
}

describe('member resource discovery and booking', () => {
  it('searches by type/date/capacity, shows booked and open times, and submits the selected slot', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [resource] })
      .mockResolvedValueOnce({ ok: true, json: async () => availability })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'b-1', creditCost: 4, status: 'CONFIRMED' }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await searchAndChoose(user)
    expect(screen.getByText(/Existing bookings/)).toBeInTheDocument()
    expect(screen.getByText(/2030-05-01 10:00 to 2030-05-01 11:00/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /11:00 to 2030-05-01 12:00.*use/i }))
    expect(screen.getByLabelText('Start time')).toHaveValue('2030-05-01T11:00')
    expect(screen.getByLabelText('End time')).toHaveValue('2030-05-01T12:00')
    await user.click(screen.getByRole('button', { name: 'Submit booking' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Cost: 4 credits.')
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
    await user.type(screen.getByLabelText('Start time'), '2030-05-01T11:00')
    await user.type(screen.getByLabelText('End time'), '2030-05-01T12:00')
    await user.click(screen.getByRole('button', { name: 'Submit booking' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('not have enough credits')
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
    await user.type(screen.getByLabelText('Start time'), '2030-05-01T11:00')
    await user.type(screen.getByLabelText('End time'), '2030-05-01T12:00')
    await user.click(screen.getByRole('button', { name: 'Submit booking' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This slot is no longer available')
  })
})
