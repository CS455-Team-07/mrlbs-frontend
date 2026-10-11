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
    expect(isAuthorizedAdmin('ananya@iitk.ac.in')).toBe(true)
    expect(isAuthorizedAdmin('admin@iitk.ac.in')).toBe(true)
    expect(isAuthorizedAdmin('ANANYA@IITK.AC.IN')).toBe(true)
  })

  it('returns false for non-administrator identities', () => {
    expect(isAuthorizedAdmin('student@iitk.ac.in')).toBe(false)
    expect(isAuthorizedAdmin('rohan.member@iitk.ac.in')).toBe(false)
    expect(isAuthorizedAdmin('')).toBe(false)
  })

  it('allows dynamic configuration of authorized administrators', () => {
    setAuthorizedAdmins(['custom.admin@iitk.ac.in'])
    expect(isAuthorizedAdmin('custom.admin@iitk.ac.in')).toBe(true)
    expect(isAuthorizedAdmin('ananya@iitk.ac.in')).toBe(false)
    expect(getAuthorizedAdmins()).toEqual(['custom.admin@iitk.ac.in'])
  })
})
