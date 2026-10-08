import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  resetAuthorizedAdmins,
  setAuthorizedAdmins,
} from '../config/adminConfig'
import { AppRoutes } from '../routes/AppRoutes'
import { clearUserStorage } from '../services/userService'

describe('LoginPage Google Institutional Authentication Flow (FR-1.2 / US-1)', () => {
  beforeEach(() => {
    clearUserStorage()
    resetAuthorizedAdmins()
  })

  it('allows Ananya to sign in and assigns Admin role when in authorized admin configuration', async () => {
    setAuthorizedAdmins(['ananya@institution.edu'])

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    // Fill form and submit
    const nameInput = screen.getByLabelText(/authenticated name/i)
    const emailInput = screen.getByLabelText(/institutional email address/i)
    const submitBtn = screen.getByRole('button', {
      name: /sign in with google institutional account/i,
    })

    fireEvent.change(nameInput, { target: { value: 'Ananya Sharma' } })
    fireEvent.change(emailInput, {
      target: { value: 'ananya@institution.edu' },
    })
    fireEvent.click(submitBtn)

    // Verify profile displayed
    expect(screen.getByText('Authenticated User Profile')).toBeInTheDocument()
    expect(screen.getAllByText('Ananya Sharma').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('ananya@institution.edu').length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(/Role: admin/i)).toBeInTheDocument()
  })

  it('assigns Member role to non-admin user upon first authentication', async () => {
    setAuthorizedAdmins(['admin@institution.edu'])

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    const nameInput = screen.getByLabelText(/authenticated name/i)
    const emailInput = screen.getByLabelText(/institutional email address/i)
    const submitBtn = screen.getByRole('button', {
      name: /sign in with google institutional account/i,
    })

    fireEvent.change(nameInput, { target: { value: 'Student User' } })
    fireEvent.change(emailInput, {
      target: { value: 'student@institution.edu' },
    })
    fireEvent.click(submitBtn)

    expect(screen.getAllByText('Student User').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('student@institution.edu').length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(/Role: member/i)).toBeInTheDocument()
  })
})
