import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearUserStorage,
  getActiveUserProfile,
  handleUserAuthentication,
  setActiveUserProfile,
  updateUserProfile,
} from './userService'

describe('userService', () => {
  beforeEach(() => {
    clearUserStorage()
  })

  it('creates a member profile for a normal IITK email', () => {
    const profile = handleUserAuthentication({
      email: 'student@iitk.ac.in',
    })

    expect(profile.email).toBe('student@iitk.ac.in')
    expect(profile.role).toBe('member')
    expect(profile.name).toBe('student')
    expect(profile.id).toBeTruthy()
  })

  it('creates an admin profile for an authorized admin email', () => {
    const profile = handleUserAuthentication({
      email: 'lhc@iitk.ac.in',
    })

    expect(profile.email).toBe('lhc@iitk.ac.in')
    expect(profile.role).toBe('admin')
    expect(profile.name).toBe('lhc')
  })

  it('uses the supplied name when authentication provides one', () => {
    const profile = handleUserAuthentication({
      name: 'LHC Admin',
      email: 'lhc@iitk.ac.in',
    })

    expect(profile.name).toBe('LHC Admin')
    expect(profile.role).toBe('admin')
  })

  it('preserves the existing role when the same user logs in again', () => {
    const firstProfile = handleUserAuthentication({
      email: 'student@iitk.ac.in',
    })

    expect(firstProfile.role).toBe('member')

    const secondProfile = handleUserAuthentication({
      email: 'student@iitk.ac.in',
    })

    expect(secondProfile.id).toBe(firstProfile.id)
    expect(secondProfile.role).toBe('member')
  })

  it('stores the active user profile', () => {
    const profile = handleUserAuthentication({
      email: 'student@iitk.ac.in',
    })

    const activeProfile = getActiveUserProfile()

    expect(activeProfile).toEqual(profile)
  })

  it('can explicitly set and clear the active user', () => {
    const profile = handleUserAuthentication({
      email: 'student@iitk.ac.in',
    })

    setActiveUserProfile(profile)

    expect(getActiveUserProfile()).toEqual(profile)

    setActiveUserProfile(null)

    expect(getActiveUserProfile()).toBeNull()
  })

  it('updates editable profile information without changing role or email', () => {
    const profile = handleUserAuthentication({
      email: 'student@iitk.ac.in',
    })

    const updated = updateUserProfile(profile.email, {
      name: 'Student Name',
      institutionalId: '123456',
      department: 'CSE',
      bio: 'Computer Science student',
      profileCompleted: true,
    })

    expect(updated).not.toBeNull()
    expect(updated?.name).toBe('Student Name')
    expect(updated?.institutionalId).toBe('123456')
    expect(updated?.department).toBe('CSE')
    expect(updated?.bio).toBe('Computer Science student')
    expect(updated?.profileCompleted).toBe(true)

    expect(updated?.email).toBe('student@iitk.ac.in')
    expect(updated?.role).toBe('member')
  })

  it('returns null when updating a user that does not exist', () => {
    const updated = updateUserProfile('unknown@iitk.ac.in', {
      name: 'Unknown',
    })

    expect(updated).toBeNull()
  })

  it('clears all stored authentication data', () => {
    handleUserAuthentication({
      email: 'student@iitk.ac.in',
    })

    expect(getActiveUserProfile()).not.toBeNull()

    clearUserStorage()

    expect(getActiveUserProfile()).toBeNull()
  })
})