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

  useEffect(() => {
    const loadResources = async () => {
      await Promise.resolve()
      await Promise.all([fetchResources(), fetchInactiveResources()])
    }

    void loadResources()
  }, [requiredType])

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

  if (!user) {
    return (
      <section className="my-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-slate-600">Please sign in to access the dashboard.</p>
      </section>
    )
  }
  return (
    <section className="my-auto mx-auto w-full max-w-5xl py-6 space-y-6">
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
                              <option value="OPEN">Open</option>
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
    </section>
  )
}
