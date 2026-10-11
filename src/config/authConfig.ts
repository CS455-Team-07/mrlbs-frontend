export const authenticationEnabled =
  import.meta.env.VITE_AUTH_ENABLED === 'true' ||
  (import.meta.env.VITE_AUTH_ENABLED === undefined && import.meta.env.MODE === 'test')

export const demoProfile = {
  id: 'local-demo-user',
  name: 'Demo Admin',
  email: 'demo@mrlbs.local',
  role: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
} as const
