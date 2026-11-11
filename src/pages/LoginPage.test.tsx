import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { clearCsrfTokenCache } from '../services/apiClient'
import { clearUserStorage, handleUserAuthentication } from '../services/userService'
import { LoginPage } from './LoginPage'

const email = 'ananya@iitk.ac.in'
const password = 'example test password'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  clearCsrfTokenCache()
  clearUserStorage()
})

function renderLoginPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/member" element={<h1>Member dashboard</h1>} />
          <Route path="/admin" element={<h1>Admin dashboard</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function response(status: number, body: object = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function enter(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('institutional password sign-in', () => {
  it('signs in with a password and the backend-issued role', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200, { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce(response(200, { id: 'member-id', name: 'Ananya', email, role: 'member' }))
    vi.stubGlobal('fetch', fetchMock)
    renderLoginPage()

    enter('IITK email address', email)
    enter('Password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Member dashboard' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/auth\/login$/),
      expect.objectContaining({ method: 'POST', credentials: 'include', body: JSON.stringify({ email, password }) }),
    )
  })

  it.each([
    ['LHC Admin', 'lhc@iitk.ac.in'],
    ['GPU Admin', 'gpus@iitk.ac.in'],
    ['KD Lab Admin', 'kdlab@iitk.ac.in'],
  ])('fills the canonical address for %s and signs in with a password', async (name, adminEmail) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200, { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce(response(200, { id: 'admin-id', name, email: adminEmail, role: 'admin' }))
    vi.stubGlobal('fetch', fetchMock)
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name }))
    expect(screen.getByLabelText('IITK email address')).toHaveValue(adminEmail)
    enter('Password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/auth\/login$/),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: adminEmail, password }) }),
    )
  })

  it('uses the emailed code to save a password and returns to sign-in', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200, { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' }))
      .mockResolvedValueOnce(response(204))
      .mockResolvedValueOnce(response(204))
    vi.stubGlobal('fetch', fetchMock)
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    enter('IITK email address', email)
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }))
    expect(await screen.findByLabelText('Verification code')).toBeInTheDocument()
    enter('Verification code', '123456')
    enter('New password', password)
    enter('Confirm new password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Password saved.')
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/auth\/reset-password$/),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email, password, code: '123456' }) }),
    )
    expect(localStorage.getItem('mrlbs_active_user_profile')).toBeNull()
  })

  it('rejects non-IITK email before sending a login request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(401))
    vi.stubGlobal('fetch', fetchMock)
    renderLoginPage()

    enter('IITK email address', 'person@example.com')
    enter('Password', password)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Use your @iitk.ac.in email address.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('requires a valid backend session to restore a cached profile', async () => {
    handleUserAuthentication({ email, name: 'Ananya' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401)))
    renderLoginPage()

    await waitFor(() => expect(localStorage.getItem('mrlbs_active_user_profile')).toBeNull())
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })
})
