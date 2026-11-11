import { isAuthorizedAdmin } from '../config/adminConfig'
import type { UserProfile, UserRole } from '../types/User'

const USER_PROFILE_STORAGE_KEY = 'mrlbs_active_user_profile'
const USER_REGISTRY_STORAGE_KEY = 'mrlbs_user_profiles_registry'

export interface AuthenticatedIdentity {
  email: string
  name?: string
  id?: string
  role?: UserRole
}

/**
 * Helper to safely access localStorage in browser/test environments.
 */
function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  return null
}

/**
 * Retrieves all stored user profiles indexed by email.
 */
export function getUserRegistry(): Record<string, UserProfile> {
  const storage = getStorage()

  if (!storage) return {}

  try {
    const data = storage.getItem(USER_REGISTRY_STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

/**
 * Saves user registry to storage.
 */
function saveUserRegistry(
  registry: Record<string, UserProfile>,
): void {
  const storage = getStorage()

  if (!storage) return

  try {
    storage.setItem(
      USER_REGISTRY_STORAGE_KEY,
      JSON.stringify(registry),
    )
  } catch (err) {
    console.error(
      'Failed to save user registry to storage',
      err,
    )
  }
}

/**
 * Caches profile details for the signed-in identity.
 * A role and ID supplied by the backend supersede the cached values.
 */
export function handleUserAuthentication(
  identity: AuthenticatedIdentity,
): UserProfile {
  const normalizedEmail = identity.email.trim().toLowerCase()

  const registry = getUserRegistry()

  if (registry[normalizedEmail]) {
    const existingProfile = {
      ...registry[normalizedEmail],
      id: identity.id ?? registry[normalizedEmail].id,
      role: identity.role ?? registry[normalizedEmail].role,
    }
    registry[normalizedEmail] = existingProfile
    saveUserRegistry(registry)

    setActiveUserProfile(existingProfile)

    return existingProfile
  }

  const assignedRole: UserRole = identity.role ?? (isAuthorizedAdmin(normalizedEmail)
    ? 'admin'
    : 'member')

  const profileName =
    identity.name?.trim() ||
    normalizedEmail.split('@')[0]

  // Create the new user profile.
  const newProfile: UserProfile = {
    id:
      identity.id ||
      `user_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`,

    name: profileName,

    email: normalizedEmail,

    role: assignedRole,

    createdAt: new Date().toISOString(),
  }

  // Store the profile in the registry.
  registry[normalizedEmail] = newProfile

  saveUserRegistry(registry)

  // Set the profile as the currently active user.
  setActiveUserProfile(newProfile)

  return newProfile
}

/**
 * Retrieves the currently active authenticated user profile
 * from persistent storage.
 */
export function getActiveUserProfile(): UserProfile | null {
  const storage = getStorage()

  if (!storage) return null

  try {
    const data = storage.getItem(USER_PROFILE_STORAGE_KEY)

    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Sets the active user profile in persistent storage.
 */
export function setActiveUserProfile(
  profile: UserProfile | null,
): void {
  const storage = getStorage()

  if (!storage) return

  try {
    if (profile) {
      storage.setItem(
        USER_PROFILE_STORAGE_KEY,
        JSON.stringify(profile),
      )
    } else {
      storage.removeItem(USER_PROFILE_STORAGE_KEY)
    }
  } catch (err) {
    console.error(
      'Failed to update active user profile in storage',
      err,
    )
  }
}

/**
 * Updates an existing user profile with additional information
 * such as avatar, institutional ID, department, and bio.
 *
 * The user's role and authenticated email cannot be changed here.
 */
export function updateUserProfile(
  email: string,
  updates: Partial<
    Pick<
      UserProfile,
      | 'name'
      | 'avatarUrl'
      | 'institutionalId'
      | 'department'
      | 'bio'
      | 'profileCompleted'
    >
  >,
): UserProfile | null {
  const normalizedEmail = email.trim().toLowerCase()

  const registry = getUserRegistry()

  const existing = registry[normalizedEmail]

  if (!existing) return null

  const updatedProfile: UserProfile = {
    ...existing,
    ...updates,
  }

  registry[normalizedEmail] = updatedProfile

  saveUserRegistry(registry)

  setActiveUserProfile(updatedProfile)

  return updatedProfile
}

/**
 * Clears active session and stored registry.
 * Useful for logout/test cleanup.
 */
export function clearUserStorage(): void {
  const storage = getStorage()

  if (!storage) return

  storage.removeItem(USER_PROFILE_STORAGE_KEY)
  storage.removeItem(USER_REGISTRY_STORAGE_KEY)
}
