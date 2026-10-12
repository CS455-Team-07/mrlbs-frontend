import { useContext, useState, type FormEvent, type ReactNode } from 'react'
import { apiClientConfig, csrfFetch } from '../services/apiClient'
import type { Resource } from '../types/Resource'
import { AuthContext } from '../context/authContextInstance'
import { getScopeForEmail } from '../config/adminConfig'

export function ResourceOnboardingForm({ onCreated }: { onCreated?: () => void } = {}) {
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null
  const adminScope = user?.email ? getScopeForEmail(user.email) : null
  const lockedType = adminScope?.resourceType ?? null

  const [name, setName] = useState('')
  const [type, setType] = useState(lockedType ?? '')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
  const [minimumDurationHours, setMinimumDurationHours] = useState('1')
  const [maximumContentionMultiplier, setMaximumContentionMultiplier] = useState('3')
  const [baseRate, setBaseRate] = useState('0')
  const [minDurationMinutes, setMinDurationMinutes] = useState('30')
  const [maxDurationMinutes, setMaxDurationMinutes] = useState('180')
  const [bufferTimeMinutes, setBufferTimeMinutes] = useState('15')
  const [maxBookingsPerMember, setMaxBookingsPerMember] = useState('3')
  const [approvalRequired, setApprovalRequired] = useState(false)
  const [rules, setRules] = useState([''])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdResource, setCreatedResource] = useState<Resource | null>(null)

  function updateRule(index: number, value: string) {
    setRules((currentRules) =>
      currentRules.map((rule, ruleIndex) =>
        ruleIndex === index ? value : rule,
      ),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setCreatedResource(null)

    const parsedMin = Number(minDurationMinutes)
    const parsedMax = Number(maxDurationMinutes)

    if (parsedMin <= 0) {
      setError('Minimum duration must be greater than 0.')
      setIsSaving(false)
      return
    }

    if (parsedMax <= 0) {
      setError('Maximum duration must be greater than 0.')
      setIsSaving(false)
      return
    }

    if (parsedMin > parsedMax) {
      setError('Minimum duration cannot be greater than maximum duration.')
      setIsSaving(false)
      return
    }

    const finalType = lockedType || type

    try {
      const response = await csrfFetch(`${apiClientConfig.baseUrl}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type: finalType,
          location,
          capacity: capacity ? Number(capacity) : null,
          baseRate: baseRate ? Number(baseRate) : 0,
          minimumDurationHours: Number(minimumDurationHours),
          maximumContentionMultiplier: Number(maximumContentionMultiplier),
          minDurationMinutes: parsedMin,
          maxDurationMinutes: parsedMax,
          bufferTimeMinutes: Number(bufferTimeMinutes),
          maxBookingsPerMember: Number(maxBookingsPerMember),
          bookingRule: {
            bookingPolicy: approvalRequired ? 'APPROVAL_REQUIRED' : 'OPEN',
            minDurationMinutes: parsedMin,
            maxDurationMinutes: parsedMax,
            bufferTimeMinutes: Number(bufferTimeMinutes),
            maxBookingsPerMember: Number(maxBookingsPerMember),
          },
          approvalRequired,
          rules: rules.map((rule) => rule.trim()).filter(Boolean),
        }),
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Only an Admin can onboard a resource.')
        }

        const problem = (await response.json().catch(() => null)) as {
          detail?: string
        } | null
        throw new Error(problem?.detail ?? 'The resource could not be saved.')
      }

      const resource = (await response.json()) as Resource
      setCreatedResource(resource)
      onCreated?.()
      setName('')
      if (!lockedType) setType('')
      setLocation('')
      setCapacity('')
      setMinimumDurationHours('1')
      setMaximumContentionMultiplier('3')
      setMinDurationMinutes('30')
      setMaxDurationMinutes('180')
      setBufferTimeMinutes('15')
      setMaxBookingsPerMember('3')
      setApprovalRequired(false)
      setRules([''])
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'The resource could not be saved. Please try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl py-8">
      <header className="mb-8">
        <p className="text-sm font-semibold text-blue-700">Admin area</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Add a lab resource
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Record the resource details and the rules Members should follow when
          booking it.
        </p>
      </header>

      <form
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="resource-name" label="Resource name">
            <input
              autoComplete="off"
              className={inputClassName}
              id="resource-name"
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </FormField>

          <FormField id="resource-type" label="Type or category">
            {lockedType ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
                  {lockedType}
                </span>
                <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">locked</span>
              </div>
            ) : (
              <input
                className={inputClassName}
                id="resource-type"
                maxLength={100}
                onChange={(event) => setType(event.target.value)}
                placeholder="For example, Lab, Microscope, or 3D Printer"
                required
                value={type}
              />
            )}
          </FormField>

          <FormField id="resource-location" label="Location">
            <input
              autoComplete="organization-title"
              className={inputClassName}
              id="resource-location"
              maxLength={255}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Building and room"
              required
              value={location}
            />
          </FormField>

          <FormField
            hint="Leave blank if this resource does not have a capacity limit."
            id="resource-capacity"
            label="Capacity (optional)"
          >
            <input
              className={inputClassName}
              id="resource-capacity"
              min="1"
              onChange={(event) => setCapacity(event.target.value)}
              placeholder="For example, 20"
              type="number"
              value={capacity}
            />
          </FormField>

          <FormField
            hint="Hourly rate charged to members in credits (default 0 for free resources)."
            id="base-rate"
            label="Base credit rate (optional)"
          >
            <input
              className={inputClassName}
              id="base-rate"
              min="0"
              onChange={(event) => setBaseRate(event.target.value)}
              step="0.01"
              type="number"
              value={baseRate}
            />
          </FormField>

          <FormField hint="Shorter bookings are priced at this minimum duration." id="minimum-duration" label="Minimum billable duration (hours)">
            <input
              className={inputClassName}
              id="minimum-duration"
              min="0.01"
              onChange={(event) => setMinimumDurationHours(event.target.value)}
              required
              step="0.01"
              type="number"
              value={minimumDurationHours}
            />
          </FormField>

          <FormField hint="Contention pricing is capped at this multiplier." id="contention-cap" label="Maximum contention multiplier">
            <input
              className={inputClassName}
              id="contention-cap"
              min="0"
              onChange={(event) => setMaximumContentionMultiplier(event.target.value)}
              required
              step="0.01"
              type="number"
              value={maximumContentionMultiplier}
            />
          </FormField>

          <FormField hint="Shortest booking slot allowed in minutes (default 30)." id="min-duration-minutes" label="Min duration (minutes)">
            <input
              className={inputClassName}
              id="min-duration-minutes"
              min="1"
              onChange={(event) => setMinDurationMinutes(event.target.value)}
              required
              type="number"
              value={minDurationMinutes}
            />
          </FormField>

          <FormField hint="Longest booking slot allowed in minutes (default 180)." id="max-duration-minutes" label="Max duration (minutes)">
            <input
              className={inputClassName}
              id="max-duration-minutes"
              min="1"
              onChange={(event) => setMaxDurationMinutes(event.target.value)}
              required
              type="number"
              value={maxDurationMinutes}
            />
          </FormField>

          <FormField hint="Turnaround buffer time between bookings in minutes (default 15)." id="buffer-time-minutes" label="Buffer time (minutes)">
            <input
              className={inputClassName}
              id="buffer-time-minutes"
              min="0"
              onChange={(event) => setBufferTimeMinutes(event.target.value)}
              type="number"
              value={bufferTimeMinutes}
            />
          </FormField>

          <FormField hint="Maximum active bookings allowed per member (default 3)." id="max-bookings-per-member" label="Max bookings per member">
            <input
              className={inputClassName}
              id="max-bookings-per-member"
              min="1"
              onChange={(event) => setMaxBookingsPerMember(event.target.value)}
              type="number"
              value={maxBookingsPerMember}
            />
          </FormField>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
          <input checked={approvalRequired} className="mt-1" onChange={(event) => setApprovalRequired(event.target.checked)} type="checkbox" />
          <span><span className="font-semibold text-slate-900">Require Admin approval for bookings</span><span className="mt-1 block text-slate-500">Requests stay pending until reviewed by an Admin.</span></span>
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-800">
            Initial booking rules
          </legend>
          <p className="text-sm text-slate-500">
            Add at least one rule, such as a booking duration or safety
            requirement.
          </p>
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div className="flex gap-3" key={index}>
                <label className="sr-only" htmlFor={`resource-rule-${index}`}>
                  Rule {index + 1}
                </label>
                <input
                  className={inputClassName}
                  id={`resource-rule-${index}`}
                  maxLength={1000}
                  onChange={(event) => updateRule(index, event.target.value)}
                  placeholder="For example, Bookings are limited to 2 hours"
                  required={index === 0}
                  value={rule}
                />
                {rules.length > 1 && (
                  <button
                    aria-label={`Remove rule ${index + 1}`}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      setRules((currentRules) =>
                        currentRules.filter((_, ruleIndex) => ruleIndex !== index),
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => setRules((currentRules) => [...currentRules, ''])}
            type="button"
          >
            Add another rule
          </button>
        </fieldset>

        {error && (
          <p
            aria-live="polite"
            className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}

        {createdResource && (
          <p
            aria-live="polite"
            className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
            role="status"
          >
            {createdResource.name} was added successfully.
          </p>
        )}

        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button
            className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? 'Saving resource…' : 'Save resource'}
          </button>
        </div>
      </form>
    </section>
  )
}

function FormField({
  children,
  hint,
  id,
  label,
}: {
  children: ReactNode
  hint?: string
  id: string
  label: string
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-800" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

const inputClassName =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100'
