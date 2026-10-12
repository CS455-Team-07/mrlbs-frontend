export interface BookingRule {
  bookingPolicy?: string
  minDurationMinutes?: number
  maxDurationMinutes?: number
  bufferTimeMinutes?: number
  maxBookingsPerMember?: number
}

export interface Resource {
  id: string | number
  name: string
  type?: string
  location?: string
  capacity?: number
  bookingRule?: BookingRule
  rules?: string[]
  baseRate?: number
  minimumDurationHours?: number
}
