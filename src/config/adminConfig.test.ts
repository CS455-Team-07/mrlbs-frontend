import { beforeEach, describe, expect, it } from 'vitest'
import {
  getAuthorizedAdmins,
  isAuthorizedAdmin,
  resetAuthorizedAdmins,
  setAuthorizedAdmins,
} from './adminConfig'

describe('Authorized Administrator Configuration', () => {
  beforeEach(() => {
    resetAuthorizedAdmins()
  })

  it('identifies default authorized administrator identities', () => {
    expect(isAuthorizedAdmin('ananya@institution.edu')).toBe(true)
    expect(isAuthorizedAdmin('admin@institution.edu')).toBe(true)
    expect(isAuthorizedAdmin('ANANYA@INSTITUTION.EDU')).toBe(true)
  })

  it('returns false for non-administrator identities', () => {
    expect(isAuthorizedAdmin('student@institution.edu')).toBe(false)
    expect(isAuthorizedAdmin('rohan.member@institution.edu')).toBe(false)
    expect(isAuthorizedAdmin('')).toBe(false)
  })

  it('allows dynamic configuration of authorized administrators', () => {
    setAuthorizedAdmins(['custom.admin@institution.edu'])
    expect(isAuthorizedAdmin('custom.admin@institution.edu')).toBe(true)
    expect(isAuthorizedAdmin('ananya@institution.edu')).toBe(false)
    expect(getAuthorizedAdmins()).toEqual(['custom.admin@institution.edu'])
  })
})
