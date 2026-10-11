
import type { Resource } from '../types/Resource'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

export async function getResources(): Promise<Resource[]> {
  const response = await fetch(`${API_BASE_URL}/resources`)

  if (!response.ok) {
    throw new Error(`Failed to fetch resources: ${response.status}`)
  }

  return response.json()
}

export type ResourceSearchCriteria = {
  type?: string
  date?: string
  startTime?: string
  endTime?: string
  capacity?: number
}

export async function searchResources(
  criteria: ResourceSearchCriteria,
): Promise<Resource[]> {
  const params = new URLSearchParams()

  if (criteria.type?.trim()) {
    params.set('type', criteria.type.trim())
  }

  if (criteria.date) {
    params.set('date', criteria.date)
  }

  if (criteria.startTime) {
    params.set('startTime', criteria.startTime)
  }

  if (criteria.endTime) {
    params.set('endTime', criteria.endTime)
  }

  if (
    criteria.capacity !== undefined &&
    Number.isFinite(criteria.capacity)
  ) {
    params.set('capacity', String(criteria.capacity))
  }

  const response = await fetch(
    `${API_BASE_URL}/resources/search?${params.toString()}`,
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      message || `Failed to search resources: ${response.status}`,
    )
  }

  return response.json()
}

export async function deactivateResource(
  resourceId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/resources/${resourceId}`,
    { method: 'DELETE' },
  )

  if (!response.ok) {
    throw new Error(
      `Failed to deactivate resource: ${response.status}`,
    )
  }
}

export async function getInactiveResources(): Promise<Resource[]> {
  const response = await fetch(`${API_BASE_URL}/resources/inactive`)

  if (!response.ok) {
    throw new Error(
      `Failed to fetch inactive resources: ${response.status}`,
    )
  }

  return response.json()
}

export async function restoreResource(resourceId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/resources/${resourceId}/restore`,
    { method: 'PUT' },
  )

  if (!response.ok) {
    throw new Error(`Failed to restore resource: ${response.status}`)
  }
}

export type CreateBookingRequest = {
  resourceId: number
  startTime: string
  endTime: string
}

export async function createBooking(
  request: CreateBookingRequest,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Failed to create booking')
  }
}
