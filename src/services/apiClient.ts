/** Central configuration entry point for REST API and authentication requests. */
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export const apiClientConfig = {
  baseUrl,
  authBaseUrl:
    import.meta.env.VITE_AUTH_BASE_URL ?? baseUrl.replace(/\/api\/?$/, ''),
} as const
