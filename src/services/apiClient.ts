/** Central configuration entry point for REST API and authentication requests. */
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

export const apiClientConfig = {
  baseUrl,
  // OAuth and REST endpoints are served by the same backend. Deriving this
  // origin prevents sign-in from silently targeting a different local port.
  authBaseUrl: baseUrl.replace(/\/api\/?$/, ''),
} as const

/**
 * Fetches a fresh CSRF token from the backend, then performs the requested
 * mutating fetch (DELETE, PUT, POST, PATCH) with the token attached and
 * credentials included.  Drop-in replacement for `fetch` for mutating calls.
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const csrfResponse = await fetch(`${baseUrl}/auth/csrf`, {
    credentials: 'include',
  })
  if (!csrfResponse.ok) {
    throw new Error('Could not retrieve CSRF token.')
  }
  const csrf = (await csrfResponse.json()) as {
    token: string
    headerName: string
  }

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers ?? {}),
      [csrf.headerName]: csrf.token,
    },
  })
}
