
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

import ResourceSearch from '../components/ResourceSearch'

const categories = [
  {
    title: 'Computer Labs',
    description: 'Computing spaces and laboratory workstations.',
    type: 'Laboratory',
    symbol: '💻',
  },
  {
    title: 'Lecture Halls',
    description: 'Teaching spaces and lecture rooms.',
    type: 'Lecture Hall',
    symbol: '🎓',
  },
  {
    title: 'GPU Resources',
    description: 'High-performance computing resources.',
    type: 'GPU',
    symbol: '⚡',
  },
  {
    title: 'Lab Equipment',
    description: 'Equipment available for laboratory use.',
    type: 'Equipment',
    symbol: '🔬',
  },
]

export function MemberDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('')

  if (!user) {
    return (
      <section className="mx-auto w-full max-w-3xl py-6">
        <p className="text-slate-600">
          Please sign in to access the member dashboard.
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 py-6">
      <div>
        <p className="text-sm font-medium text-blue-700">
          Member area
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Available Resources
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Find the right space or equipment for your work.
        </p>
      </div>

      <ResourceSearch initialType={selectedCategory} />

      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <button
            key={category.title}
            type="button"
            onClick={() => {
              setSelectedCategory(category.type)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedCategory === category.type
              ? 'border-blue-500 ring-2 ring-blue-100'
              : 'border-slate-200 hover:border-blue-300'
              }`}
          >
            <span className="text-3xl">{category.symbol}</span>
            <h2 className="mt-4 font-semibold text-slate-900">
              {category.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {category.description}
            </p>
            <p className="mt-3 text-sm font-medium text-blue-700">
              Search this category →
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}
