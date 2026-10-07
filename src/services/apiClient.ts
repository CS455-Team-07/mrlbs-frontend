/** Central configuration entry point for future REST API clients. */
export const apiClientConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
} as const
