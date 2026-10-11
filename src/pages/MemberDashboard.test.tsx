import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemberDashboard } from './MemberDashboard'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('member booking submission', () => {
  it('submits an authenticated booking request with CSRF protection', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'b-1', creditCost: 4, status: 'CONFIRMED' }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await user.type(screen.getByLabelText('Resource ID'), '0d415dd5-d10e-4e7e-b809-75e84bddf5ed')
    await user.type(screen.getByLabelText('Start time'), '2030-05-01T10:00')
    await user.type(screen.getByLabelText('End time'), '2030-05-01T11:00')
    await user.click(screen.getByRole('button', { name: 'Submit booking' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Cost: 4 credits.')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf' },
    })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({
      resourceId: '0d415dd5-d10e-4e7e-b809-75e84bddf5ed',
      startTime: '2030-05-01T10:00',
      endTime: '2030-05-01T11:00',
    })
  })

  it('shows a specific insufficient-credit rejection', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf', headerName: 'X-CSRF-TOKEN' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ reasonCode: 'INSUFFICIENT_CREDITS' }) })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemberDashboard />)
    await user.type(screen.getByLabelText('Resource ID'), 'resource-1')
    await user.type(screen.getByLabelText('Start time'), '2030-05-01T10:00')
    await user.type(screen.getByLabelText('End time'), '2030-05-01T11:00')
    await user.click(screen.getByRole('button', { name: 'Submit booking' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('not have enough credits')
  })
})
