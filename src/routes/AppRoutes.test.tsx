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
  it('shows one-time code sign-in from the login route', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    render(<MemoryRouter initialEntries={['/login']}><AppRoutes /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: /sign in to mrlbs/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /email me a verification code/i })).toBeInTheDocument()
  })
})
