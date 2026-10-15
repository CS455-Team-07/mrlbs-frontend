import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { Resource } from '../types/Resource'
import { ResourceOnboardingForm } from './ResourceOnboardingForm'
import { deactivateResource } from '../services/resourceService'
import {
  getInactiveResources,
  restoreResource,
} from '../services/resourceService'
import { csrfFetch } from '../services/apiClient'
import { getScopeForEmail } from '../config/adminConfig'
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'
type ResourceDraft = {
  name: string
  type: string
  location: string
  capacity: number
  bookingPolicy: string
  minDurationMinutes: number
  maxDurationMinutes: number
  bufferTimeMinutes: number
  maxBookingsPerMember: number
}

type AiReviewSummary = {
  recommendation?: 'RECOMMEND_APPROVAL' | 'RECOMMEND_REJECTION' | 'NEEDS_HUMAN_REVIEW'
  confidenceScore?: number
  rationale?: string
  supportingEvidence?: string
  dataLimitations?: string
  isDemonstrationData?: boolean
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'FALLBACK_HUMAN_ONLY'
  modelName?: string
}

type ApprovalRequest = {
  id: string
  memberEmail: string
  resourceName: string
  resourceType: string
  startTime: string
  endTime: string
  createdAt?: string
  status: string
  aiReview?: AiReviewSummary | null
}

type ValidationFailureModalState = {
  bookingId: string
  reason: string
  resourceName: string
  memberEmail: string
}

type RejectionModalState = {
  bookingId: string
  resourceName: string
  memberEmail: string
  reason: string
}
const makeDraft = (resource: Resource): ResourceDraft => ({
  name: resource.name ?? '',
  type: resource.type ?? '',
  location: resource.location ?? '',
  capacity: resource.capacity ?? 0,
  bookingPolicy: resource.bookingRule?.bookingPolicy ?? 'FCFS',
  minDurationMinutes: resource.bookingRule?.minDurationMinutes ?? 30,
  maxDurationMinutes: resource.bookingRule?.maxDurationMinutes ?? 180,
  bufferTimeMinutes: resource.bookingRule?.bufferTimeMinutes ?? 15,
  maxBookingsPerMember: resource.bookingRule?.maxBookingsPerMember ?? 3,
})
export function AdminDashboard() {
  const { user } = useAuth()
  const adminScope = user?.email ? getScopeForEmail(user.email) : null
  const requiredType = adminScope?.resourceType ?? null

  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [drafts, setDrafts] = useState<Record<string | number, ResourceDraft>>({})
  const [savingId, setSavingId] = useState<string | number | null>(null)
  const [saveError, setSaveError] = useState('')
  const [deactivatingId, setDeactivatingId] = useState<string | number | null>(null)
  const [deactivateError, setDeactivateError] = useState('')
  const [inactiveResources, setInactiveResources] = useState<Resource[]>([])
  const [restoringId, setRestoringId] = useState<string | number | null>(null)
  const [restoreError, setRestoreError] = useState('')
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([])
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [approvalError, setApprovalError] = useState('')
  const [processingApprovalIds, setProcessingApprovalIds] = useState<Set<string>>(new Set())
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(new Set())
  const [validationFailureModal, setValidationFailureModal] = useState<ValidationFailureModalState | null>(null)
  const [rejectionModal, setRejectionModal] = useState<RejectionModalState | null>(null)
  const [rejectionSubmitting, setRejectionSubmitting] = useState(false)
  const [rejectionModalError, setRejectionModalError] = useState('')

  const toggleReviewExpanded = (id: string) => {
    setExpandedReviewIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const fetchResources = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/resources`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load resources')
      }
      const data = (await response.json()) as Resource[]
      // Apply admin scope filtering – only show resources matching the admin's assigned type
      const filtered = requiredType
        ? data.filter((r) => r.type?.toLowerCase() === requiredType.toLowerCase())
        : data
      setResources(filtered)
      setDrafts(
        Object.fromEntries(filtered.map((resource) => [resource.id, makeDraft(resource)])),
      )
      setError('')
    } catch (err) {
      console.error(err)
      setError('Unable to load configured resources right now.')
    } finally {
      setLoading(false)
    }
  }

  const fetchInactiveResources = async () => {
    try {
      const data = await getInactiveResources()
      const filtered = requiredType
        ? data.filter((r) => r.type?.toLowerCase() === requiredType.toLowerCase())
        : data
      setInactiveResources(filtered)
      setRestoreError('')
    } catch (error) {
      console.error('Failed to load inactive resources:', error)
      setRestoreError('Unable to load inactive resources.')
    }
  }

  const fetchApprovalRequests = async () => {
    if (user?.role !== 'admin') {
      setApprovalRequests([])
      return
    }

    try {
      setApprovalLoading(true)
      const response = await fetch(`${API_BASE_URL}/bookings/approvals`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load approval requests')
      }
      const data = (await response.json()) as ApprovalRequest[]
      const sorted = [...data].sort((a, b) => {
        const dayA = new Date(a.startTime).toISOString().slice(0, 10)
        const dayB = new Date(b.startTime).toISOString().slice(0, 10)
        const dayDiff = dayA.localeCompare(dayB)
        if (dayDiff !== 0) return dayDiff

        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        const createdDiff = createdA - createdB
        if (createdDiff !== 0) return createdDiff

        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      })
      setApprovalRequests(sorted)
      setApprovalError('')
    } catch (error) {
      console.error('Failed to load approval requests:', error)
      setApprovalError('Unable to load approval requests right now.')
      setApprovalRequests([])
    } finally {
      setApprovalLoading(false)
    }
  }

  useEffect(() => {
    const loadResources = async () => {
      await Promise.resolve()
      await Promise.all([fetchResources(), fetchInactiveResources(), user?.role === 'admin' ? fetchApprovalRequests() : Promise.resolve()])
    }

    void loadResources()
  }, [requiredType, user?.role, user?.email])

  const updateDraft = (resourceId: string | number, field: keyof ResourceDraft, value: string | number) => {
    setDrafts((current) => ({
      ...current,
      [resourceId]: {
        ...(current[resourceId] ?? {
          name: '',
          type: '',
          location: '',
          capacity: 0,
          bookingPolicy: 'FCFS',
          minDurationMinutes: 30,
          maxDurationMinutes: 180,
          bufferTimeMinutes: 15,
          maxBookingsPerMember: 3,
        }),
        [field]: value,
      },
    }))
  }
  const saveResource = async (resource: Resource) => {
    const draft = drafts[resource.id]
    if (!draft) return
    try {
      setSavingId(resource.id)
      setSaveError('')
      const response = await csrfFetch(`${API_BASE_URL}/resources/${resource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: draft.name,
          type: draft.type,
          location: draft.location,
          capacity: Number(draft.capacity),
          bookingRule: {
            bookingPolicy: draft.bookingPolicy,
            minDurationMinutes: Number(draft.minDurationMinutes),
            maxDurationMinutes: Number(draft.maxDurationMinutes),
            bufferTimeMinutes: Number(draft.bufferTimeMinutes),
            maxBookingsPerMember: Number(draft.maxBookingsPerMember),
          },
        }),
      })
      if (!response.ok) {
        throw new Error('Unable to save resource')
      }
      const updated = (await response.json()) as Resource
      setResources((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setDrafts((current) => ({
        ...current,
        [updated.id]: makeDraft(updated),
      }))
      setEditingId(null)
    } catch (err) {
      console.error(err)
      setSaveError('Changes could not be saved. Please check the values and try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleApprove = async (request: ApprovalRequest) => {
    try {
      setProcessingApprovalIds((current) => new Set([...current, request.id]))
      setApprovalError('')
      const response = await csrfFetch(`${API_BASE_URL}/bookings/${request.id}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        let failureReason = 'The booking request could not be approved due to validation failure.'
        try {
          const problem = await response.json()
          failureReason = problem.detail || problem.message || failureReason
        } catch {
          // fallback
        }
        setValidationFailureModal({
          bookingId: request.id,
          reason: failureReason,
          resourceName: request.resourceName,
          memberEmail: request.memberEmail,
        })
        return
      }

      await fetchApprovalRequests()
    } catch (error) {
      console.error(error)
      setApprovalError('Could not process approval. Please try again.')
    } finally {
      setProcessingApprovalIds((current) => {
        const next = new Set(current)
        next.delete(request.id)
        return next
      })
    }
  }

  const handleOpenReject = (request: ApprovalRequest, initialReason = '') => {
    setRejectionModal({
      bookingId: request.id,
      resourceName: request.resourceName,
      memberEmail: request.memberEmail,
      reason: initialReason,
    })
    setRejectionModalError('')
  }

  const handleConfirmReject = async () => {
    if (!rejectionModal) return
    const trimmedReason = rejectionModal.reason.trim()
    if (!trimmedReason) {
      setRejectionModalError('A rejection reason is required.')
      return
    }

    try {
      setRejectionSubmitting(true)
      setRejectionModalError('')
      const response = await csrfFetch(`${API_BASE_URL}/bookings/${rejectionModal.bookingId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: trimmedReason }),
      })

      if (!response.ok) {
        let msg = 'Unable to reject booking request.'
        try {
          const problem = await response.json()
          msg = problem.detail || problem.message || msg
        } catch {}
        throw new Error(msg)
      }

      setRejectionModal(null)
      await fetchApprovalRequests()
    } catch (error) {
      console.error(error)
      setRejectionModalError(error instanceof Error ? error.message : 'Could not reject the booking request.')
    } finally {
      setRejectionSubmitting(false)
    }
  }

  const handleRestore = async (resourceId: string | number) => {
    try {
      setRestoringId(resourceId)
      setRestoreError('')

      await restoreResource(resourceId)
      await fetchResources()
      await fetchInactiveResources()
    } catch (error) {
      console.error(error)
      setRestoreError('Unable to restore this resource.')
    } finally {
      setRestoringId(null)
    }
  }
  const handleDeactivate = async (resource: Resource) => {
    const confirmed = window.confirm(
      `Deactivate "${resource.name}"? It will no longer appear in active resource listings.`,
    )
    if (!confirmed) return

    try {
      setDeactivatingId(resource.id)
      setDeactivateError('')
      await deactivateResource(resource.id)
      await fetchResources()
      await fetchInactiveResources()

      setResources((current) => current.filter((item) => item.id !== resource.id))
      setDrafts((current) => {
        const updated = { ...current }
        delete updated[resource.id]
        return updated
      })
      if (editingId === resource.id) setEditingId(null)
    } catch (err) {
      console.error(err)
      setDeactivateError(`Could not deactivate "${resource.name}". Please try again.`)
    } finally {
      setDeactivatingId(null)
    }
  }

  const approvalGroups = approvalRequests.reduce<Record<string, ApprovalRequest[]>>((groups, request) => {
    const key = new Date(request.startTime).toISOString().slice(0, 10)
    groups[key] = [...(groups[key] ?? []), request]
    return groups
  }, {})

  if (!user) {
    return (
      <section className="my-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-slate-600">Please sign in to access the dashboard.</p>
      </section>
    )
  }
  return (
    <section className="my-auto mx-auto w-full max-w-5xl py-6 space-y-6">
      {user?.role === 'admin' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Approval queue</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Pending booking requests</h3>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {approvalRequests.length}
            </span>
          </div>

          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Requests are reviewed in submission order when multiple members request the same resource and time slot.
          </p>

          {approvalLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading approval requests...</p>
          ) : approvalError ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {approvalError}
            </p>
          ) : approvalRequests.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No pending bookings for your resource scope.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {Object.entries(approvalGroups)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, requests]) => (
                  <div key={dateKey} className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      {new Date(`${dateKey}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </h4>
                    {requests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{request.resourceName}</p>
                            <p className="text-xs uppercase tracking-wide text-slate-500">{request.resourceType}</p>
                          </div>
                          <div className="text-sm text-slate-600 sm:text-right">
                            <div>{request.memberEmail}</div>
                            <div>
                              {new Date(request.startTime).toLocaleString([], { timeStyle: 'short' })} - {' '}
                              {new Date(request.endTime).toLocaleString([], { timeStyle: 'short' })}
                            </div>
                            {request.createdAt && (
                              <div className="text-xs text-slate-400 mt-0.5">
                                Requested: {new Date(request.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1 min-w-0 pr-0 sm:pr-4">
                            {(() => {
                              const ai = request.aiReview
                              if (!ai || ai.status === 'PENDING') {
                                return (
                                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/90 px-3 py-2 text-xs font-medium text-slate-600 animate-pulse">
                                    <span>🤖</span>
                                    <span>AI evaluation in progress...</span>
                                  </div>
                                )
                              }
                              if (ai.status === 'FALLBACK_HUMAN_ONLY' || ai.status === 'FAILED') {
                                return (
                                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600">
                                    <span>🤖</span>
                                    <span><strong>Advisory:</strong> Manual review only (AI offline)</span>
                                  </div>
                                )
                              }

                              const isExpanded = expandedReviewIds.has(request.id)
                              const rec = ai.recommendation
                              let badgeColor = 'border-amber-200 bg-amber-50 text-amber-900'
                              let label = 'Needs Human Review'
                              let icon = '⚠️'

                              if (rec === 'RECOMMEND_APPROVAL') {
                                badgeColor = 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                label = 'Recommend Approval'
                                icon = '✅'
                              } else if (rec === 'RECOMMEND_REJECTION') {
                                badgeColor = 'border-rose-200 bg-rose-50 text-rose-900'
                                label = 'Recommend Rejection'
                                icon = '🛑'
                              }

                              const confPct = ai.confidenceScore != null ? Math.round(ai.confidenceScore * 100) : null

                              return (
                                <div className={`rounded-xl border p-2.5 text-xs shadow-sm transition-all ${badgeColor}`}>
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 font-semibold">
                                      <span>{icon}</span>
                                      <span>AI: {label}</span>
                                      {confPct != null && (
                                        <span className="font-normal opacity-80">({confPct}% confidence)</span>
                                      )}
                                    </div>
                                    {(ai.supportingEvidence || ai.dataLimitations) && (
                                      <button
                                        type="button"
                                        onClick={() => toggleReviewExpanded(request.id)}
                                        className="text-[11px] font-medium underline opacity-80 hover:opacity-100 cursor-pointer"
                                      >
                                        {isExpanded ? 'Hide details' : 'View evidence'}
                                      </button>
                                    )}
                                  </div>

                                  {ai.rationale && (
                                    <p className="mt-1 text-[11px] leading-relaxed opacity-95">
                                      {ai.rationale}
                                    </p>
                                  )}

                                  {isExpanded && (
                                    <div className="mt-2 space-y-1.5 border-t border-current/15 pt-2 text-[11px]">
                                      {ai.supportingEvidence && (
                                        <div>
                                          <span className="font-semibold">Supporting Evidence: </span>
                                          <span className="opacity-90">{ai.supportingEvidence}</span>
                                        </div>
                                      )}
                                      {ai.dataLimitations && (
                                        <div>
                                          <span className="font-semibold">Limitations: </span>
                                          <span className="opacity-90">{ai.dataLimitations}</span>
                                        </div>
                                      )}
                                      {ai.isDemonstrationData && (
                                        <div className="mt-1">
                                          <span className="inline-block rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-medium">
                                            Demonstration Telemetry
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                          <div className="flex shrink-0 justify-end gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleOpenReject(request)}
                              disabled={processingApprovalIds.has(request.id)}
                              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleApprove(request)}
                              disabled={processingApprovalIds.has(request.id)}
                              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                            >
                              {processingApprovalIds.has(request.id) ? 'Updating...' : 'Approve'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-purple-700">Admin area</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Admin Dashboard</h2>
          {adminScope && (
            <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
              {adminScope.scopeLabel} only
            </span>
          )}
        </div>
        <p className="mt-3 text-slate-600">
          Welcome, {user.name}!
          {adminScope
            ? ` You manage ${adminScope.scopeLabel} resources.`
            : ' Review and configure the lab resources currently available in the system.'}
        </p>
        <div className="mt-6">
          {deactivateError && (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deactivateError}
            </p>
          )}
          {loading ? (
            <p className="text-sm text-slate-500">Loading configured resources...</p>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : resources.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No resources are configured yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {resources.map((resource) => {
                const draft = drafts[resource.id]
                const isEditing = editingId === resource.id
                return (
                  <div
                    key={resource.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                          {resource.type ?? 'Resource'}
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-slate-900">
                          {resource.name}
                        </h3>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                        #{resource.id}
                      </span>
                    </div>
                    {!isEditing ? (
                      <>
                        <dl className="mt-4 space-y-2 text-sm text-slate-600">
                          {resource.location && (
                            <div className="flex justify-between gap-3">
                              <dt>Location</dt>
                              <dd className="font-medium text-slate-900">{resource.location}</dd>
                            </div>
                          )}
                          {resource.capacity !== undefined && (
                            <div className="flex justify-between gap-3">
                              <dt>Capacity</dt>
                              <dd className="font-medium text-slate-900">{resource.capacity}</dd>
                            </div>
                          )}
                          {resource.bookingRule?.bookingPolicy && (
                            <div className="flex justify-between gap-3">
                              <dt>Booking Policy</dt>
                              <dd className="font-medium text-slate-900">
                                {resource.bookingRule.bookingPolicy}
                              </dd>
                            </div>
                          )}
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(resource.id)
                              setDrafts((current) => ({
                                ...current,
                                [resource.id]: makeDraft(resource),
                              }))
                              setSaveError('')
                            }}
                            className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
                          >
                            Configure
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeactivate(resource)}
                            disabled={deactivatingId === resource.id}
                            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deactivatingId === resource.id ? 'Deactivating...' : 'Deactivate'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 space-y-3 rounded-xl border border-purple-200 bg-white p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm text-slate-700">
                            Name
                            <input
                              value={draft.name}
                              onChange={(event) => updateDraft(resource.id, 'name', event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="text-sm text-slate-700">
                            Type
                            <input
                              value={draft.type}
                              onChange={(event) => updateDraft(resource.id, 'type', event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="text-sm text-slate-700">
                            Location
                            <input
                              value={draft.location}
                              onChange={(event) => updateDraft(resource.id, 'location', event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="text-sm text-slate-700">
                            Capacity
                            <input
                              type="number"
                              min={1}
                              value={draft.capacity}
                              onChange={(event) => updateDraft(resource.id, 'capacity', Number(event.target.value))}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="text-sm text-slate-700">
                            Booking policy
                            <select
                              value={draft.bookingPolicy}
                              onChange={(event) => updateDraft(resource.id, 'bookingPolicy', event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="FCFS">FCFS</option>
                              <option value="APPROVAL_REQUIRED">Approval required</option>
                            </select>
                          </label>
                          <label className="text-sm text-slate-700">
                            Min duration
                            <input
                              type="number"
                              min={1}
                              value={draft.minDurationMinutes}
                              onChange={(event) => updateDraft(resource.id, 'minDurationMinutes', Number(event.target.value))}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="text-sm text-slate-700">
                            Max duration
                            <input
                              type="number"
                              min={1}
                              value={draft.maxDurationMinutes}
                              onChange={(event) => updateDraft(resource.id, 'maxDurationMinutes', Number(event.target.value))}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="text-sm text-slate-700">
                            Buffer time
                            <input
                              type="number"
                              min={0}
                              value={draft.bufferTimeMinutes}
                              onChange={(event) => updateDraft(resource.id, 'bufferTimeMinutes', Number(event.target.value))}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="text-sm text-slate-700 sm:col-span-2">
                            Max bookings per member
                            <input
                              type="number"
                              min={1}
                              value={draft.maxBookingsPerMember}
                              onChange={(event) => updateDraft(resource.id, 'maxBookingsPerMember', Number(event.target.value))}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>
                        </div>
                        {saveError && (
                          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {saveError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveResource(resource)}
                            disabled={savingId === resource.id}
                            className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {savingId === resource.id ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null)
                              setSaveError('')
                            }}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Inactive Resources
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Restore resources that were previously deactivated.
        </p>

        {restoreError && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {restoreError}
          </p>
        )}

        {inactiveResources.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No inactive resources found.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {inactiveResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {resource.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {resource.type ?? 'Unspecified type'}
                    {' · '}
                    Capacity: {resource.capacity ?? 'N/A'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRestore(resource.id)}
                  disabled={restoringId === resource.id}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                >
                  {restoringId === resource.id ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ResourceOnboardingForm onCreated={() => { void fetchResources() }} />

      {/* ── Validation Failure Modal ─────────────────────────────── */}
      {validationFailureModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setValidationFailureModal(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700 text-xl font-bold">
                ⚠️
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Approval Validation Failure</h3>
                <p className="text-xs text-slate-500">
                  {validationFailureModal.resourceName} · {validationFailureModal.memberEmail}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold mb-1">Reason for failure:</p>
              <p className="leading-relaxed text-amber-800">{validationFailureModal.reason}</p>
            </div>

            <p className="text-xs text-slate-600">
              This request cannot be approved at this time. You can cancel to leave the booking in pending approval, or reject the booking with a reason.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setValidationFailureModal(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const failure = validationFailureModal
                  setValidationFailureModal(null)
                  setRejectionModal({
                    bookingId: failure.bookingId,
                    resourceName: failure.resourceName,
                    memberEmail: failure.memberEmail,
                    reason: failure.reason,
                  })
                  setRejectionModalError('')
                }}
                className="rounded-lg border border-rose-300 bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Reject with Reason
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Modal ────────────────────────────────────────── */}
      {rejectionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => {
            if (!rejectionSubmitting) setRejectionModal(null)
          }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-700 text-xl font-bold">
                🛑
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reject Booking Request</h3>
                <p className="text-xs text-slate-500">
                  {rejectionModal.resourceName} · {rejectionModal.memberEmail}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Please provide a reason for rejecting this booking. The reason will be persisted and sent to the member via in-app notification.
            </p>

            <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
              Rejection Reason <span className="text-rose-500">*</span>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                placeholder="Enter the specific reason for rejecting this request..."
                value={rejectionModal.reason}
                onChange={(e) => {
                  const val = e.target.value
                  setRejectionModal((prev) => (prev ? { ...prev, reason: val } : null))
                  if (rejectionModalError && val.trim()) {
                    setRejectionModalError('')
                  }
                }}
                disabled={rejectionSubmitting}
              />
            </label>

            {rejectionModalError && (
              <p className="rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                {rejectionModalError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectionModal(null)}
                disabled={rejectionSubmitting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmReject()}
                disabled={rejectionSubmitting || !rejectionModal.reason.trim()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
              >
                {rejectionSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
