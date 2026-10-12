import { describe, expect, it } from 'vitest'
import {
  isAuthorizedAdmin,
  getScopeForEmail,
  getResourceTypeForEmail,
  ADMIN_SCOPES,
} from './adminConfig'

describe('Authorized Administrator Configuration', () => {
  it('identifies scoped admin emails as authorized', () => {
    expect(isAuthorizedAdmin('lhc@iitk.ac.in')).toBe(true)
    expect(isAuthorizedAdmin('gpus@iitk.ac.in')).toBe(true)
    expect(isAuthorizedAdmin('kdlab@iitk.ac.in')).toBe(true)
    expect(isAuthorizedAdmin('demo@mrlbs.local')).toBe(true)
  })

  it('returns false for non-administrator identities', () => {
    expect(isAuthorizedAdmin('student@iitk.ac.in')).toBe(false)
    expect(isAuthorizedAdmin('rohan.member@iitk.ac.in')).toBe(false)
    expect(isAuthorizedAdmin('')).toBe(false)
  })

  it('returns the correct resource type scope for each admin', () => {
    expect(getResourceTypeForEmail('lhc@iitk.ac.in')).toBe('Lecture Hall')
    expect(getResourceTypeForEmail('gpus@iitk.ac.in')).toBe('GPU')
    expect(getResourceTypeForEmail('kdlab@iitk.ac.in')).toBe('KD Lab')
    expect(getResourceTypeForEmail('demo@mrlbs.local')).toBeNull()
  })

  it('getScopeForEmail returns null for super-admin', () => {
    expect(getScopeForEmail('demo@mrlbs.local')).toBeNull()
  })

  it('all ADMIN_SCOPES have required fields', () => {
    for (const scope of ADMIN_SCOPES) {
      expect(scope.email).toBeTruthy()
      expect(scope.name).toBeTruthy()
      expect(scope.resourceType).toBeTruthy()
      expect(scope.scopeLabel).toBeTruthy()
    }
  })
})
