
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Resource } from '../types/Resource'
import {
    searchResources,
    createBooking,
    type ResourceSearchCriteria,
} from '../services/resourceService'

type ResourceSearchProps = {
    initialType?: string
}

export default function ResourceSearch({
    initialType = '',
}: ResourceSearchProps) {
    const [type, setType] = useState(initialType)
    const [date, setDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [capacity, setCapacity] = useState('')
    const [resources, setResources] = useState<Resource[]>([])
    const [loading, setLoading] = useState(false)
    const [bookingResourceId, setBookingResourceId] = useState<number | null>(null)
    const [error, setError] = useState('')
    const [hasSearched, setHasSearched] = useState(false)

    async function performSearch(criteria: ResourceSearchCriteria) {
        setLoading(true)
        setError('')
        setHasSearched(true)

        try {
            const results = await searchResources(criteria)
            setResources(results)
        } catch (err) {
            setResources([])
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to search resources. Please try again.',
            )
        } finally {
            setLoading(false)
        }
    }

    // Update results when a category card is selected.
    useEffect(() => {
        setType(initialType)
        void performSearch({ type: initialType })
    }, [initialType])

    function handleSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (date && (!startTime || !endTime)) {
            setError(
                'Please select both start time and end time for availability search.',
            )
            return
        }

        if (!date && (startTime || endTime)) {
            setError('Please select a date when specifying a time interval.')
            return
        }

        if (startTime && endTime && startTime >= endTime) {
            setError('End time must be later than start time.')
            return
        }

        if (capacity && Number(capacity) < 0) {
            setError('Capacity cannot be negative.')
            return
        }

        void performSearch({
            type,
            date: date || undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            capacity: capacity ? Number(capacity) : undefined,
        })
    }

    function clearFilters() {
        setType(initialType)
        setDate('')
        setStartTime('')
        setEndTime('')
        setCapacity('')

        void performSearch({ type: initialType })
    }

    async function handleBookResource(resourceId: number) {
        if (!date || !startTime || !endTime) {
            setError('Select a date, start time, and end time before booking.')
            return
        }

        if (startTime >= endTime) {
            setError('End time must be later than start time.')
            return
        }

        setBookingResourceId(resourceId)
        setError('')

        try {
            await createBooking({
                resourceId,
                startTime: `${date}T${startTime}:00`,
                endTime: `${date}T${endTime}:00`,
            })

            window.alert('Booking request submitted successfully.')

            await performSearch({
                type,
                date,
                startTime,
                endTime,
                capacity: capacity ? Number(capacity) : undefined,
            })
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to submit the booking request.',
            )
        } finally {
            setBookingResourceId(null)
        }
    }

    const fieldStyle = {
        width: '100%',
        boxSizing: 'border-box' as const,
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: 'white',
        color: '#111827',
        fontSize: '14px',
    }

    const labelStyle = {
        display: 'block',
        marginBottom: '7px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#374151',
    }

    const buttonStyle = {
        padding: '11px 18px',
        borderRadius: '8px',
        border: 'none',
        background: '#2563eb',
        color: 'white',
        fontWeight: 600,
        cursor: 'pointer',
    }

    return (
        <section style={{ width: '100%' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2
                    style={{
                        margin: '0 0 6px',
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#111827',
                    }}
                >
                    Find a Resource
                </h2>

                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                    Search by category, date, time, and capacity.
                </p>
            </div>

            <form
                onSubmit={handleSearch}
                style={{
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    background: '#ffffff',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px',
                }}
            >
                <div>
                    <label htmlFor="resource-type" style={labelStyle}>
                        Resource Type
                    </label>
                    <input
                        id="resource-type"
                        type="text"
                        placeholder="e.g. Laboratory"
                        value={type}
                        onChange={(event) => setType(event.target.value)}
                        style={fieldStyle}
                    />
                </div>

                <div>
                    <label htmlFor="resource-date" style={labelStyle}>
                        Booking Date
                    </label>
                    <input
                        id="resource-date"
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        style={fieldStyle}
                    />
                </div>

                <div>
                    <label htmlFor="resource-start-time" style={labelStyle}>
                        Start Time
                    </label>
                    <input
                        id="resource-start-time"
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        style={fieldStyle}
                    />
                </div>

                <div>
                    <label htmlFor="resource-end-time" style={labelStyle}>
                        End Time
                    </label>
                    <input
                        id="resource-end-time"
                        type="time"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        style={fieldStyle}
                    />
                </div>

                <div>
                    <label htmlFor="resource-capacity" style={labelStyle}>
                        Minimum Capacity
                    </label>
                    <input
                        id="resource-capacity"
                        type="number"
                        min="0"
                        placeholder="Number of people"
                        value={capacity}
                        onChange={(event) => setCapacity(event.target.value)}
                        style={fieldStyle}
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'end',
                        gap: '10px',
                        flexWrap: 'wrap',
                    }}
                >
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...buttonStyle,
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'Searching...' : 'Search Resources'}
                    </button>

                    <button
                        type="button"
                        onClick={clearFilters}
                        disabled={loading}
                        style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            background: 'white',
                            color: '#374151',
                            cursor: 'pointer',
                        }}
                    >
                        Clear
                    </button>
                </div>
            </form>

            {error && (
                <div
                    role="alert"
                    style={{
                        padding: '12px 14px',
                        marginBottom: '18px',
                        borderRadius: '8px',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        fontSize: '14px',
                    }}
                >
                    {error}
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '14px',
                }}
            >
                <h3 style={{ margin: 0, fontSize: '17px', color: '#111827' }}>
                    Search Results
                </h3>

                {!loading && (
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {resources.length} resource{resources.length === 1 ? '' : 's'}
                    </span>
                )}
            </div>

            {!loading && hasSearched && resources.length === 0 && !error && (
                <div
                    style={{
                        padding: '28px 18px',
                        textAlign: 'center',
                        border: '1px dashed #d1d5db',
                        borderRadius: '12px',
                        color: '#6b7280',
                    }}
                >
                    No matching resources found. Try changing your filters or time slot.
                </div>
            )}

            {loading && (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    Loading resources...
                </p>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: '16px',
                }}
            >
                {resources.map((resource) => (
                    <article
                        key={resource.id}
                        style={{
                            padding: '18px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            background: 'white',
                        }}
                    >
                        <h4
                            style={{
                                margin: '0 0 8px',
                                fontSize: '17px',
                                color: '#111827',
                            }}
                        >
                            {resource.name}
                        </h4>

                        <p
                            style={{
                                margin: '0 0 6px',
                                color: '#4b5563',
                                fontSize: '14px',
                            }}
                        >
                            {resource.type || 'Uncategorized resource'}
                        </p>

                        {resource.location && (
                            <p
                                style={{
                                    margin: '0 0 6px',
                                    color: '#6b7280',
                                    fontSize: '13px',
                                }}
                            >
                                Location: {resource.location}
                            </p>
                        )}

                        {resource.capacity != null && (
                            <p
                                style={{
                                    margin: '0 0 10px',
                                    color: '#6b7280',
                                    fontSize: '13px',
                                }}
                            >
                                Capacity: {resource.capacity}
                            </p>
                        )}

                        {date && startTime && endTime && (
                            <p
                                style={{
                                    margin: '0 0 10px',
                                    color: '#047857',
                                    fontSize: '13px',
                                }}
                            >
                                Selected interval: {startTime}–{endTime}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={() => void handleBookResource(resource.id)}
                            disabled={loading || bookingResourceId !== null}
                            style={{
                                marginTop: '12px',
                                padding: '10px 16px',
                                border: 'none',
                                borderRadius: '8px',
                                background: '#2563eb',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                opacity:
                                    loading || bookingResourceId !== null ? 0.7 : 1,
                            }}
                        >
                            {bookingResourceId === resource.id
                                ? 'Submitting...'
                                : 'Book Resource'}
                        </button>
                    </article>
                ))}
            </div>
        </section>
    )
}
