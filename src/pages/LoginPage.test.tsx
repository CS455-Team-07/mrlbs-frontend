import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { clearUserStorage, handleUserAuthentication, setActiveUserProfile } from '../services/userService'
import { LoginPage } from './LoginPage'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  clearUserStorage()
})

function renderLoginPage() {
  if (!vi.isMockFunction(fetch)) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(false, {})))
  }
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

function response(ok: boolean, body: object) {
  return { ok, status: ok ? 200 : 400, json: async () => body, text: async () => JSON.stringify(body) }
}

describe('institutional email sign-in', () => {
  it('offers one-time-code sign-in restricted to IITK email', () => {
    renderLoginPage()

    expect(screen.getByLabelText(/iitk member email address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue to sign in/i })).toBeInTheDocument()
  })

  it('starts member login through the API and proceeds to code entry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(false, {}))
      .mockResolvedValueOnce(response(true, { status: 'OTP_REQUIRED', message: 'Code sent' }))
    vi.stubGlobal('fetch', fetchMock)
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/iitk member email address/i), { target: { value: 'ananya@iitk.ac.in' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to sign in/i }))

    expect(await screen.findByLabelText(/6-digit verification code/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://localhost:8080/api/auth/login',
      expect.objectContaining({ method: 'POST', credentials: 'include', body: JSON.stringify({ email: 'ananya@iitk.ac.in', role: 'member' }) }),
    )
  })

  it('creates a local profile only after the backend verifies the code', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(false, {}))
      .mockResolvedValueOnce(response(true, { status: 'OTP_REQUIRED', message: 'Code sent' }))
      .mockResolvedValueOnce(response(true, { id: 'mail-ananya@iitk.ac.in', name: 'Ananya', email: 'ananya@iitk.ac.in' }))
    vi.stubGlobal('fetch', fetchMock)
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/iitk member email address/i), { target: { value: 'ananya@iitk.ac.in' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to sign in/i }))
    const codeField = await screen.findByLabelText(/6-digit verification code/i)
    expect(localStorage.getItem('mrlbs_active_user_profile')).toBeNull()
    fireEvent.change(codeField, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verify and sign in/i }))

    await waitFor(() => expect(localStorage.getItem('mrlbs_active_user_profile')).toContain('ananya@iitk.ac.in'))
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://localhost:8080/api/auth/verify-code',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'ananya@iitk.ac.in', code: '123456' }) }),
    )
  })

  it('rejects an email outside the configured domain without requesting login', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(false, {}))
    vi.stubGlobal('fetch', fetchMock)
    renderLoginPage()

    fireEvent.change(screen.getByLabelText(/iitk member email address/i), { target: { value: 'person@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Only @iitk.ac.in email addresses are accepted.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('mrlbs_active_user_profile')).toBeNull()
  })

  it('does not restore a cached profile without a valid backend session', async () => {
    setActiveUserProfile(handleUserAuthentication({ email: 'ananya@iitk.ac.in', name: 'Ananya' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(false, {})))

    renderLoginPage()

    await waitFor(() => expect(localStorage.getItem('mrlbs_active_user_profile')).toBeNull())
    expect(screen.getByRole('button', { name: /continue to sign in/i })).toBeInTheDocument()
  })
})
