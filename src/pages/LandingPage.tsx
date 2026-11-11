import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LandingPage() {
  const { user } = useAuth()
  const dashboardPath = user
    ? user.role === 'admin' ? '/admin' : '/member'
    : null

  return (
    <section className="my-auto grid gap-10 py-10 md:grid-cols-[1.4fr_0.8fr] md:items-center">
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Multi-Resource Booking System
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Book resources at IIT Kanpur.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
          One platform for lecture halls, GPU clusters, and specialised labs.
          {user ? ' Manage and reserve resources from your dashboard.' : ' Sign in with your institutional account to get started.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {dashboardPath ? (
            <>
              <Link
                to={dashboardPath}
                className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
              >
                Go to my Dashboard
              </Link>
              <Link
                to="/profile"
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                View Profile
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Available resource domains</p>
        <ul className="mt-4 space-y-3">
          {[
            { icon: '🏫', label: 'Lecture Hall Complex', desc: 'Book LHC halls for lectures, seminars, and events' },
            { icon: '🖥️', label: 'GPU Resources', desc: 'Reserve GPU compute nodes for research and training' },
            { icon: '🔬', label: 'KD Lab', desc: 'Access specialised KD Lab equipment and workstations' },
          ].map((item) => (
            <li key={item.label} className="flex items-start gap-3">
              <span className="mt-0.5 text-xl">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  )
}
