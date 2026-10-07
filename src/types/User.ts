export type UserRole = 'member' | 'admin'

export interface User {
  id: string
  role: UserRole
}
