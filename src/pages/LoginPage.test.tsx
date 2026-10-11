import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { clearUserStorage } from '../services/userService'
import { LoginPage } from './LoginPage'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  clearUserStorage()
})

function renderLoginPage(initialEntries: string[] = ['/login']) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <LoginPage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('institutional Google sign-in', () => {
  it('starts Google OAuth sign-in', () => {
    renderLoginPage()

    expect(screen.getByRole('link', { name: /continue with google/i })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/oauth2\/authorization\/google$/),
    )
  })

  it('explains that an account outside the institutional domain was denied', () => {
    renderLoginPage(['/login?error=institutional-domain'])

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Use the Google Workspace account for iitk.ac.in to sign in.',
    )
  })

  it('loads and displays the signed-in identity after the OAuth callback', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'google-subject', name: 'Ananya', email: 'ananya@iitk.ac.in' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderLoginPage(['/login?authenticated'])

    expect(await screen.findByText('Signed in as Ananya')).toBeInTheDocument()
    expect(screen.getByText('ananya@iitk.ac.in')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/me$/),
      { credentials: 'include' },
    )
  })

  it('reports when the authenticated session cannot be verified', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false }),
    )

    renderLoginPage(['/login?authenticated'])

    expect(
      await screen.findByText('Your sign-in could not be verified. Please try again.'),
    ).toBeInTheDocument()
  })

  it('does not create a local platform profile for an identity outside IITK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'google-subject', name: 'External', email: 'external@example.com' }),
    }))

    renderLoginPage(['/login?authenticated'])

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Use the Google Workspace account for iitk.ac.in to sign in.',
    )
    expect(localStorage.getItem('mrlbs_active_user_profile')).toBeNull()
  })
})
