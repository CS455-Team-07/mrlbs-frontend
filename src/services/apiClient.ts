const baseUrl = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL
    || (import.meta.env.DEV ? 'http://localhost:8080/api' : 'https://mrlbs-backend.onrender.com/api')
  if (import.meta.env.PROD && !configured.startsWith('https://') && !/^\/(?![\/\\])/.test(configured)) {
    throw new Error('The production API must use HTTPS or a same-origin path.')
  }
  return configured.replace(/\/+$/, '')
})()

export const apiClientConfig = {
  baseUrl,
  // Auth and REST endpoints are served by the same backend.
  authBaseUrl: baseUrl === '/api' ? '' : baseUrl.replace(/\/api\/?$/, ''),
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
 * attached and credentials included.
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {},
  forceRefresh = false,
): Promise<Response> {
  const csrf = await getCsrfToken(forceRefresh)

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers ?? {}),
      [csrf.headerName]: csrf.token,
    },
  })
}

