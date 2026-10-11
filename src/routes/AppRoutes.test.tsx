import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'

describe('application scaffold', () => {
  it('renders the landing page and primary navigation', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: /a simple starting point/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /main navigation/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Member' })).toHaveAttribute(
      'href',
      '/member',
    )
  })
})
