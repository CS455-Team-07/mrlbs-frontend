/**
 * Configuration module for authorized system administrators.
 * Each admin email is mapped to the resource-type category they manage.
 * lhc@iitk.ac.in   → Lecture Halls
 * gpus@iitk.ac.in  → GPU Resources
 * kdlab@iitk.ac.in → KD Lab Resources
 * demo@mrlbs.local → All (super-admin, dev only)
 */

export interface AdminScope {
  /** Display name shown in the UI */
  name: string
  /** Exact resource type string stored in the backend (matches LabResource.type) */
  resourceType: string
  /** Short label for the dashboard heading */
  scopeLabel: string
  /** Email of this scoped admin */
  email: string
}

/** Hardcoded scoped admin definitions – mirrors AdminResourceScope.java */
export const ADMIN_SCOPES: AdminScope[] = [
  {
    email: 'lhc@iitk.ac.in',
    name: 'LHC Admin',
    resourceType: 'Lecture Hall',
    scopeLabel: 'Lecture Hall Complex',
  },
  {
    email: 'gpus@iitk.ac.in',
    name: 'GPU Admin',
    resourceType: 'GPU',
    scopeLabel: 'GPU Resources',
  },
  {
    email: 'kdlab@iitk.ac.in',
    name: 'KD Lab Admin',
    resourceType: 'KD Lab',
    scopeLabel: 'KD Lab Resources',
  },
]

/**
 * Returns the scope definition for the given admin email, or null if the
 * email corresponds to a super-admin (all resources).
 */
export function getScopeForEmail(email: string): AdminScope | null {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  return ADMIN_SCOPES.find((s) => s.email === normalized) ?? null
}

/**
 * Returns the resource type that the given admin may manage, or null when
 * they have unrestricted access.
 */
export function getResourceTypeForEmail(email: string): string | null {
  return getScopeForEmail(email)?.resourceType ?? null
}

/**
 * Returns true when the given email belongs to a recognisable admin identity
 * (scoped or super-admin).
 */
export function isAuthorizedAdmin(email: string): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return (
    normalized === 'demo@mrlbs.local' ||
    ADMIN_SCOPES.some((s) => s.email === normalized)
  )
}
