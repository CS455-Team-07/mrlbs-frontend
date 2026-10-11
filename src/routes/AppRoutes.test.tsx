import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'

describe('application navigation and authentication flow', () => {
  it('shows the login page when the application is opened', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      screen.getAllByText(/multi-resource lab booking system/i).length,
    ).toBeGreaterThan(0)

    expect(
      screen.getByRole('heading', {
        name: /institutional login/i,
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByLabelText(/iitk email address/i),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /login as admin/i,
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /login as member/i,
      }),
    ).toBeInTheDocument()
  })

  it('allows an IITK member to log in and reach the home page', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    const emailInput = screen.getByLabelText(/iitk email address/i)

    fireEvent.change(emailInput, {
      target: {
        value: 'student@iitk.ac.in',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /login as member/i,
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: /welcome, student/i,
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(/student@iitk.ac.in/i),
    ).toBeInTheDocument()
  })

  it('rejects a non-IITK email address', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    const emailInput = screen.getByLabelText(/iitk email address/i)

    fireEvent.change(emailInput, {
      target: {
        value: 'student@gmail.com',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /login as member/i,
      }),
    )

    expect(
      screen.getByText(/please use a valid iitk email address/i),
    ).toBeInTheDocument()
  })

  it('shows the profile option after login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    const emailInput = screen.getByLabelText(/iitk email address/i)

    fireEvent.change(emailInput, {
      target: {
        value: 'student@iitk.ac.in',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /login as member/i,
      }),
    )

    expect(
      screen.getByRole('button', {
        name: /open profile/i,
      }),
    ).toBeInTheDocument()
  })
})