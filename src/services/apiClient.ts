/** Central configuration entry point for REST API and authentication requests. */
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

export const apiClientConfig = {
  baseUrl,
  // Auth and REST endpoints are served by the same backend.
  authBaseUrl: baseUrl.replace(/\/api\/?$/, ''),
} as const

interface CsrfData {
  token: string
  headerName: string
}

let cachedCsrf: CsrfData | null = null
let csrfPromise: Promise<CsrfData> | null = null

/**
 * Returns the cached CSRF token or fetches a fresh one from the backend.
 * Concurrent callers share a single in-flight network request.
 */
export async function getCsrfToken(forceRefresh = false): Promise<CsrfData> {
  if (!forceRefresh && cachedCsrf) {
    return cachedCsrf
  }
  if (!forceRefresh && csrfPromise) {
    return csrfPromise
  }

  csrfPromise = fetch(`${baseUrl}/auth/csrf`, {
    credentials: 'include',
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Could not retrieve CSRF token.')
      }
      const data = (await response.json()) as CsrfData
      cachedCsrf = data
      return data
    })
    .finally(() => {
      csrfPromise = null
    })

  return csrfPromise
}

export function clearCsrfTokenCache(): void {
  cachedCsrf = null
  csrfPromise = null
}

/**
 * Performs a mutating fetch (DELETE, PUT, POST, PATCH) with the cached CSRF token
 * attached and credentials included. If the backend rejects with 403, it refreshes
 * the token once and retries automatically.
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const csrf = await getCsrfToken()

  let response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers ?? {}),
      [csrf.headerName]: csrf.token,
    },
  })

  // If session rotated or token expired, invalidate cache and retry once
  if (response.status === 403) {
    clearCsrfTokenCache()
    const freshCsrf = await getCsrfToken(true)
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.headers ?? {}),
        [freshCsrf.headerName]: freshCsrf.token,
      },
    })
  }

  return response
}
