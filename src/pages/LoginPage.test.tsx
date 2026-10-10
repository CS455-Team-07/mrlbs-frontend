import { render, fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  resetAuthorizedAdmins,
  setAuthorizedAdmins,
} from '../config/adminConfig'
import { AppRoutes } from '../routes/AppRoutes'
import { clearUserStorage } from '../services/userService'

describe('LoginPage institutional email authentication flow', () => {
  beforeEach(() => {
    clearUserStorage()
    resetAuthorizedAdmins()
  })

  it('allows Ananya to sign in and assigns Admin role when in authorized admin configuration', async () => {
    setAuthorizedAdmins(['ananya@iitk.ac.in'])

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    const emailInput = screen.getByLabelText(/IITK Email Address/i)
    const adminButton = screen.getByRole('button', {
      name: /login as admin/i,
    })

    fireEvent.change(emailInput, {
      target: { value: 'ananya@iitk.ac.in' },
    })
    fireEvent.click(adminButton)

    expect(screen.getByText(/Welcome, ananya/i)).toBeInTheDocument()
    expect(screen.getAllByText('ananya@iitk.ac.in').length).toBeGreaterThan(0)
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
  })

  it('assigns Member role to non-admin user upon first authentication', async () => {
    setAuthorizedAdmins(['admin@iitk.ac.in'])

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    const emailInput = screen.getByLabelText(/IITK Email Address/i)
    const memberButton = screen.getByRole('button', {
      name: /login as member/i,
    })

    fireEvent.change(emailInput, {
      target: { value: 'student@iitk.ac.in' },
    })
    fireEvent.click(memberButton)

    expect(screen.getByText(/Welcome, student/i)).toBeInTheDocument()
    expect(screen.getAllByText('student@iitk.ac.in').length).toBeGreaterThan(0)
    expect(screen.getAllByText('member').length).toBeGreaterThan(0)
  })
})
