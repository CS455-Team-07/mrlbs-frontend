import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { clearUserStorage } from '../services/userService'
import { AppRoutes } from './AppRoutes'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  clearUserStorage()
})

describe('application navigation and institutional authentication', () => {
  it('offers Google OAuth sign-in from the login route', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: /sign in to mrlbs/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /continue with google/i }),
    ).toHaveAttribute('href', expect.stringMatching(/\/oauth2\/authorization\/google$/))
  })

  it('adds the verified Google identity to the app session after callback verification', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'google-subject', name: 'Ananya', email: 'ananya@iitk.ac.in' }),
    }))

    render(
      <MemoryRouter initialEntries={['/login?authenticated']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Signed in as Ananya')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open profile/i })).toBeInTheDocument()
  })

  it('explains when Google rejects an identity outside the institutional domain', () => {
    render(
      <MemoryRouter initialEntries={['/login?error=institutional-domain']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Use the Google Workspace account for iitk.ac.in to sign in.',
    )
  })
})
