import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('institutional Google sign-in', () => {
  it('starts Google OAuth sign-in', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /continue with google/i })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/oauth2\/authorization\/google$/),
    )
  })

  it('explains that an account outside the institutional domain was denied', () => {
    render(
      <MemoryRouter initialEntries={['/login?error=institutional-domain']}>
        <LoginPage />
      </MemoryRouter>,
    )

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

    render(
      <MemoryRouter initialEntries={['/login?authenticated']}>
        <LoginPage />
      </MemoryRouter>,
    )

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

    render(
      <MemoryRouter initialEntries={['/login?authenticated']}>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('Your sign-in could not be verified. Please try again.'),
    ).toBeInTheDocument()
  })
})
