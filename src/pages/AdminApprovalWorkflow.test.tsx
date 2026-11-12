import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminDashboard } from './AdminDashboard'
import { AuthContext, type AuthContextType } from '../context/authContextInstance'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const mockAdminAuth: AuthContextType = {
  user: {
    id: 'admin-1',
    email: 'demo@mrlbs.local',
    name: 'Super Admin',
    role: 'admin',
    profileCompleted: true,
  },
  role: 'admin',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
}

const mockRequest = {
  id: 'b-101',
  memberEmail: 'student@iitk.ac.in',
  resourceName: 'DGX Station 1',
  resourceType: 'GPU',
  startTime: '2030-06-01T10:00:00',
  endTime: '2030-06-01T12:00:00',
  status: 'PENDING_APPROVAL',
  aiReview: null,
}

function renderAdminDashboard() {
  return render(
    <AuthContext.Provider value={mockAdminAuth}>
      <AdminDashboard />
    </AuthContext.Provider>
  )
}

describe('Admin Approval and Rejection Workflow', () => {
  it('approves an available slot and reloads the approval queue', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const urlStr = String(url)
      if (urlStr.includes('/resources/inactive')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/resources') && (!init || init.method === 'GET' || !init.method)) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/auth/csrf')) {
        return Promise.resolve({ ok: true, json: async () => ({ token: 'test-csrf', headerName: 'X-CSRF-TOKEN' }) })
      }
      if (urlStr.includes('/bookings/approvals')) {
        return Promise.resolve({ ok: true, json: async () => [mockRequest] })
      }
      if (urlStr.includes('/bookings/b-101/approve')) {
        return Promise.resolve({ ok: true, json: async () => ({ id: 'b-101', status: 'CONFIRMED' }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderAdminDashboard()

    await screen.findByText('DGX Station 1')
    expect(screen.getByText('student@iitk.ac.in')).toBeInTheDocument()

    const approveButton = screen.getByRole('button', { name: 'Approve' })
    await user.click(approveButton)

    await waitFor(() => {
      const approveCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/bookings/b-101/approve'))
      expect(approveCall).toBeDefined()
      expect(approveCall?.[1]?.method).toBe('POST')
    })
  })

  it('shows validation failure modal on conflict/insufficient credits and allows cancel', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const urlStr = String(url)
      if (urlStr.includes('/resources/inactive')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/resources') && (!init || init.method === 'GET' || !init.method)) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/auth/csrf')) {
        return Promise.resolve({ ok: true, json: async () => ({ token: 'test-csrf', headerName: 'X-CSRF-TOKEN' }) })
      }
      if (urlStr.includes('/bookings/approvals')) {
        return Promise.resolve({ ok: true, json: async () => [mockRequest] })
      }
      if (urlStr.includes('/bookings/b-101/approve')) {
        return Promise.resolve({
          ok: false,
          status: 422,
          json: async () => ({
            detail: 'This time window clashes with an already booked slot. Please select the exact slot to go to waitlist or choose a different time.',
            reasonCode: 'SLOT_CONFLICT',
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderAdminDashboard()

    await screen.findByText('DGX Station 1')
    const approveButton = screen.getByRole('button', { name: 'Approve' })
    await user.click(approveButton)

    // Validation failure modal appears
    await screen.findByText('Approval Validation Failure')
    expect(screen.getByText(/clashes with an already booked slot/)).toBeInTheDocument()

    // Clicking cancel leaves booking unchanged
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('Approval Validation Failure')).not.toBeInTheDocument()
    })
  })

  it('transitions from validation failure to rejection modal with prefilled reason', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const urlStr = String(url)
      if (urlStr.includes('/resources/inactive')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/resources') && (!init || init.method === 'GET' || !init.method)) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/auth/csrf')) {
        return Promise.resolve({ ok: true, json: async () => ({ token: 'test-csrf', headerName: 'X-CSRF-TOKEN' }) })
      }
      if (urlStr.includes('/bookings/approvals')) {
        return Promise.resolve({ ok: true, json: async () => [mockRequest] })
      }
      if (urlStr.includes('/bookings/b-101/approve')) {
        return Promise.resolve({
          ok: false,
          status: 422,
          json: async () => ({
            detail: 'The member does not have enough credits for this booking.',
            reasonCode: 'INSUFFICIENT_CREDITS',
          }),
        })
      }
      if (urlStr.includes('/bookings/b-101/reject')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'b-101', status: 'REJECTED', rejectionReason: 'Insufficient credits and member was contacted.' }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderAdminDashboard()

    await screen.findByText('DGX Station 1')
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await screen.findByText('Approval Validation Failure')
    expect(screen.getByText(/does not have enough credits/)).toBeInTheDocument()

    // Click Reject with Reason
    await user.click(screen.getByRole('button', { name: 'Reject with Reason' }))

    // Rejection modal appears with prefilled reason
    await screen.findByText('Reject Booking Request')
    const textarea = screen.getByPlaceholderText(/Enter the specific reason/) as HTMLTextAreaElement
    expect(textarea.value).toContain('The member does not have enough credits')

    // Edit the reason
    await user.clear(textarea)
    await user.type(textarea, 'Insufficient credits and member was contacted.')

    // Submit rejection
    await user.click(screen.getByRole('button', { name: 'Confirm Rejection' }))

    await waitFor(() => {
      const rejectCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/bookings/b-101/reject'))
      expect(rejectCall).toBeDefined()
      expect(rejectCall?.[1]?.method).toBe('POST')
      const body = JSON.parse(rejectCall?.[1]?.body as string)
      expect(body.reason).toBe('Insufficient credits and member was contacted.')
    })
  })

  it('directly rejects a booking requiring a non-empty reason', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const urlStr = String(url)
      if (urlStr.includes('/resources/inactive')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/resources') && (!init || init.method === 'GET' || !init.method)) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/auth/csrf')) {
        return Promise.resolve({ ok: true, json: async () => ({ token: 'test-csrf', headerName: 'X-CSRF-TOKEN' }) })
      }
      if (urlStr.includes('/bookings/approvals')) {
        return Promise.resolve({ ok: true, json: async () => [mockRequest] })
      }
      if (urlStr.includes('/bookings/b-101/reject')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'b-101', status: 'REJECTED', rejectionReason: 'Maintenance scheduled during this period.' }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderAdminDashboard()

    await screen.findByText('DGX Station 1')
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    await screen.findByText('Reject Booking Request')
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Rejection' })
    expect(confirmBtn).toBeDisabled()

    const textarea = screen.getByPlaceholderText(/Enter the specific reason/)
    await user.type(textarea, 'Maintenance scheduled during this period.')
    expect(confirmBtn).toBeEnabled()

    await user.click(confirmBtn)

    await waitFor(() => {
      const rejectCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/bookings/b-101/reject'))
      expect(rejectCall).toBeDefined()
      const body = JSON.parse(rejectCall?.[1]?.body as string)
      expect(body.reason).toBe('Maintenance scheduled during this period.')
    })
  })

  it('renders "Manual review only (AI offline)" when AI review status is FALLBACK_HUMAN_ONLY', async () => {
    const offlineRequest = {
      ...mockRequest,
      id: 'b-offline',
      aiReview: {
        status: 'FALLBACK_HUMAN_ONLY',
      },
    }

    const fetchMock = vi.fn((url: string) => {
      const urlStr = String(url)
      if (urlStr.includes('/resources/inactive') || urlStr.includes('/resources')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/bookings/approvals')) {
        return Promise.resolve({ ok: true, json: async () => [offlineRequest] })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    renderAdminDashboard()

    expect(await screen.findByText(/Manual review only \(AI offline\)/)).toBeInTheDocument()
  })

  it('renders "Manual review only (AI offline)" when Gemini is unconfigured (modelName: RULE_BASED_FALLBACK)', async () => {
    const fallbackRequest = {
      ...mockRequest,
      id: 'b-fallback',
      aiReview: {
        status: 'FALLBACK_HUMAN_ONLY',
        modelName: 'RULE_BASED_FALLBACK',
        recommendation: 'NEEDS_HUMAN_REVIEW',
        confidenceScore: 0.75,
        rationale: 'Requester has no prior completed reservations on this resource to evaluate historical usage patterns. Admin review advised.',
        supportingEvidence: 'Prior bookings total: 0 (Completed: 0, Cancelled: 0, Rejected: 0, Pending: 0)',
        dataLimitations: 'Attribution limitations',
      },
    }

    const fetchMock = vi.fn((url: string) => {
      const urlStr = String(url)
      if (urlStr.includes('/resources/inactive') || urlStr.includes('/resources')) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (urlStr.includes('/bookings/approvals')) {
        return Promise.resolve({ ok: true, json: async () => [fallbackRequest] })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    renderAdminDashboard()

    expect(await screen.findByText(/Manual review only \(AI offline\)/)).toBeInTheDocument()
  })
})
