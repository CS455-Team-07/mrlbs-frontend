/**
 * Configuration module for authorized system administrators.
 * Admin roles are assigned if the user's institutional identity (email) matches
 * an identity in this authorized administrator configuration.
 */

const envAdmins = (
  import.meta.env?.VITE_AUTHORIZED_ADMIN_EMAILS as string | undefined
)
  ?.split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// Default authorized administrator identities for the institutional system
const defaultAuthorizedAdmins = [
  'ananya@iitk.ac.in',
  'admin@iitk.ac.in',
  'lab.admin@iitk.ac.in',
]

let activeAdminList: string[] =
  envAdmins && envAdmins.length > 0 ? envAdmins : [...defaultAuthorizedAdmins]

/**
 * Returns the list of currently authorized administrator identities.
 */
export function getAuthorizedAdmins(): string[] {
  return [...activeAdminList]
}

/**
 * Checks whether an institutional email/identity exists in the authorized administrator configuration.
 */
export function isAuthorizedAdmin(email: string): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return activeAdminList.includes(normalized)
}

/**
 * Updates the authorized administrator list (primarily used for configuration/testing).
 */
export function setAuthorizedAdmins(admins: string[]): void {
  activeAdminList = admins.map((e) => e.trim().toLowerCase()).filter(Boolean)
}

/**
 * Resets the authorized administrator configuration to defaults.
 */
export function resetAuthorizedAdmins(): void {
  activeAdminList =
    envAdmins && envAdmins.length > 0
      ? [...envAdmins]
      : [...defaultAuthorizedAdmins]
}
