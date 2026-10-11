export type UserRole = 'member' | 'admin'

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt?: string
  /** Base-64 data URL for the profile picture */
  avatarUrl?: string
  /** Institutional ID (e.g. roll number) */
  institutionalId?: string
  /** Department or branch */
  department?: string
  /** Short biography or note */
  bio?: string
  /** Whether the user has completed their profile setup */
  profileCompleted?: boolean
}

export type User = UserProfile
