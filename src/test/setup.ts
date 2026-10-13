import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { clearCsrfTokenCache } from '../services/apiClient'

afterEach(() => {
  cleanup()
  clearCsrfTokenCache()
})

