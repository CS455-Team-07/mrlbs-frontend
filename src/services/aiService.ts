import { apiClientConfig, csrfFetch } from './apiClient'

export interface ExtractedIntent {
  resourceType?: string | null
  date?: string | null
  startTime?: string | null
  endTime?: string | null
  minCapacity?: number | null
  clarifyingQuestion?: string | null
}

export interface ResourceRecommendation {
  resourceId: string
  name: string
  type: string
  location: string
  capacity: number | null
  baseRate: number
  bookingPolicy: string
  matchType: 'EXACT' | 'ALTERNATIVE'
  available: boolean
  date: string
  requestedStartTime: string
  requestedEndTime: string
  suggestedStartTime?: string
  suggestedEndTime?: string
  explanation: string
  rules?: string[]
}

export interface AiRecommendationResponse {
  success: boolean
  message?: string
  followUpQuestion?: string | null
  engagementPrompt?: string | null
  suggestedRefinements?: string[]
  extractedIntent?: ExtractedIntent | null
  topRecommendation?: ResourceRecommendation | null
  alternatives?: ResourceRecommendation[]
  configurationError?: boolean
}

export async function getAiStatus(): Promise<{ enabled: boolean; geminiConfigured: boolean; model: string }> {
  const response = await fetch(`${apiClientConfig.baseUrl}/ai/status`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error('Failed to retrieve AI status')
  }
  return response.json()
}

export async function askAiAssistant(
  prompt: string,
  contextDate?: string,
  previousIntent?: ExtractedIntent | null,
): Promise<AiRecommendationResponse> {
  const response = await csrfFetch(`${apiClientConfig.baseUrl}/ai/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      contextDate: contextDate || new Date().toISOString().split('T')[0],
      previousIntent: previousIntent || null,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.message ?? errorBody?.detail ?? 'AI service request failed')
  }

  return response.json()
}
