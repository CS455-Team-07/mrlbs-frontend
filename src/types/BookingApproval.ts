export interface BookingApproval {
  id: string
  resourceId: string
  resourceName: string
  startTime: string
  endTime: string
  status: 'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED'
  creditCost: number
}

export interface BookingStatusEvent {
  id: string
  bookingId: string
  fromStatus: string | null
  toStatus: string
  actorEmail: string
  occurredAt: string
  note: string | null
}
