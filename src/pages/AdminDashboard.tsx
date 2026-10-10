import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { Resource } from '../types/Resource'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

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
  bookingPolicy: resource.bookingRule?.bookingPolicy ?? 'OPEN',
  minDurationMinutes: resource.bookingRule?.minDurationMinutes ?? 30,
  maxDurationMinutes: resource.bookingRule?.maxDurationMinutes ?? 180,
  bufferTimeMinutes: resource.bookingRule?.bufferTimeMinutes ?? 15,
  maxBookingsPerMember: resource.bookingRule?.maxBookingsPerMember ?? 3,
})

export function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Record<number, ResourceDraft>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [saveError, setSaveError] = useState('')

  const fetchResources = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/resources`)

      if (!response.ok) {
        throw new Error('Failed to load resources')
      }

      const data = (await response.json()) as Resource[]
      setResources(data)
      setDrafts(
        Object.fromEntries(data.map((resource) => [resource.id, makeDraft(resource)])),
      )
      setError('')
    } catch (err) {
      console.error(err)
      setError('Unable to load configured resources right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
  }, [])

  const updateDraft = (resourceId: number, field: keyof ResourceDraft, value: string | number) => {
    setDrafts((current) => ({
      ...current,
      [resourceId]: {
        ...(current[resourceId] ?? {
          name: '',
          type: '',
          location: '',
          capacity: 0,
          bookingPolicy: 'OPEN',
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

      const response = await fetch(`${API_BASE_URL}/api/resources/${resource.id}`, {
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
        <div className="flex items-start gap-6">
          <div className="shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.name}'s avatar`}
                className="h-24 w-24 rounded-full object-cover border-2 border-purple-200 shadow-sm"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center border-2 border-purple-200">
                <span className="text-3xl font-bold text-purple-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {user.name}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
              </div>
              <span className="rounded-full bg-purple-100 text-purple-800 border border-purple-300 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {user.role} role
              </span>
            </div>

            <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {user.institutionalId && (
                <div>
                  <dt className="font-medium text-slate-500">
                    Institutional ID
                  </dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {user.institutionalId}
                  </dd>
                </div>
              )}
              {user.department && (
                <div>
                  <dt className="font-medium text-slate-500">Department</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {user.department}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-slate-500">User ID</dt>
                <dd className="mt-0.5 font-mono text-xs text-slate-600">
                  {user.id}
                </dd>
              </div>
              {user.createdAt && (
                <div>
                  <dt className="font-medium text-slate-500">Member Since</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>

            {user.bio && (
              <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Bio</p>
                <p className="text-sm text-slate-700">{user.bio}</p>
              </div>
            )}

            <div className="mt-5">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-purple-700">Admin area</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Admin Dashboard
        </h2>
        <p className="mt-3 text-slate-600">
          Welcome, {user.name}! Review and configure the lab resources currently available in the system.
        </p>

        <div className="mt-6">
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
                          className="mt-4 rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
                        >
                          Configure
                        </button>
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
    </section>
  )
}
