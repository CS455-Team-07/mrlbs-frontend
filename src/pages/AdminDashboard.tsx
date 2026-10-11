import { useState, type FormEvent, type ReactNode } from 'react'
import { apiClientConfig } from '../services/apiClient'
import type { Resource } from '../types/Resource'

export function AdminDashboard() {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
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

    try {
      const csrfResponse = await fetch(`${apiClientConfig.baseUrl}/auth/csrf`, {
        credentials: 'include',
      })
      if (!csrfResponse.ok) {
        throw new Error('Could not prepare the secure resource request.')
      }
      const csrf = (await csrfResponse.json()) as {
        token: string
        headerName: string
      }

      const response = await fetch(`${apiClientConfig.baseUrl}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [csrf.headerName]: csrf.token,
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          type,
          location,
          capacity: capacity ? Number(capacity) : null,
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
      setName('')
      setType('')
      setLocation('')
      setCapacity('')
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
            <input
              className={inputClassName}
              id="resource-type"
              maxLength={100}
              onChange={(event) => setType(event.target.value)}
              placeholder="For example, Lab, Microscope, or 3D Printer"
              required
              value={type}
            />
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
        </div>

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
