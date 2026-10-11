/** Central configuration entry point for REST API and authentication requests. */
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

export const apiClientConfig = {
  baseUrl,
  // OAuth and REST endpoints are served by the same backend. Deriving this
  // origin prevents sign-in from silently targeting a different local port.
  authBaseUrl: baseUrl.replace(/\/api\/?$/, ''),
} as const
