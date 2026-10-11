import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminDashboard } from './AdminDashboard'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('admin resource onboarding form', () => {
  it('submits resource details and CSRF token, then confirms creation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'csrf-value', headerName: 'X-CSRF-TOKEN' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'Microscope 4' }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<AdminDashboard />)

    await user.type(screen.getByLabelText('Resource name'), 'Microscope 4')
    await user.type(screen.getByLabelText('Type or category'), ' Microscope ')
    await user.type(screen.getByLabelText('Location'), 'Science Block, Room 12')
    await user.type(screen.getByLabelText('Capacity (optional)'), '8')
    await user.type(screen.getByLabelText('Rule 1'), ' Book for up to two hours ')
    await user.click(screen.getByRole('button', { name: 'Save resource' }))

    await screen.findByRole('status')
    expect(screen.getByRole('status')).toHaveTextContent('Microscope 4 was added successfully.')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]).toEqual([
      expect.stringMatching(/\/auth\/csrf$/),
      { credentials: 'include' },
    ])

    const createCall = fetchMock.mock.calls[1]
    expect(createCall[1]).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': 'csrf-value',
      },
      credentials: 'include',
    })
    expect(JSON.parse(createCall[1].body as string)).toEqual({
      name: 'Microscope 4',
      type: ' Microscope ',
      location: 'Science Block, Room 12',
      capacity: 8,
      rules: ['Book for up to two hours'],
    })
  })

  it('allows capacity to be omitted and reports a non-admin response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'csrf-value', headerName: 'X-CSRF-TOKEN' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => null })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<AdminDashboard />)

    await user.type(screen.getByLabelText('Resource name'), 'Seminar Room')
    await user.type(screen.getByLabelText('Type or category'), 'Room')
    await user.type(screen.getByLabelText('Location'), 'Main Building')
    await user.type(screen.getByLabelText('Rule 1'), 'Reserve in advance')
    await user.click(screen.getByRole('button', { name: 'Save resource' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only an Admin can onboard a resource.',
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string).capacity).toBeNull()
  })
})
