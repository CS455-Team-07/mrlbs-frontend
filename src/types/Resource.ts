export interface BookingRule {
  bookingPolicy?: string
  minDurationMinutes?: number
  maxDurationMinutes?: number
  bufferTimeMinutes?: number
  maxBookingsPerMember?: number
}

export interface Resource {
  id: number
  name: string
  type?: string
  location?: string
  capacity?: number
  bookingRule?: BookingRule
}
