import { Link } from 'react-router-dom'
import { authenticationEnabled } from '../config/authConfig'

export function LandingPage() {
  return (
    <section className="my-auto grid gap-10 py-10 md:grid-cols-[1.4fr_0.8fr] md:items-center">
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Multi-Resource Lab Booking System
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          A simple starting point for shared lab resources.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
          {authenticationEnabled
            ? 'Sign in with your institutional Google Workspace account to access shared lab resources.'
            : 'Explore shared lab resources and booking tools. Sign-in is currently turned off.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {authenticationEnabled && (
            <Link
              to="/login"
              className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
            >
              Sign in with Google
            </Link>
          )}
          <Link
            to={authenticationEnabled ? '/member' : '/admin'}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {authenticationEnabled ? 'View dashboard placeholders' : 'Open the dashboard'}
          </Link>
        </div>
      </div>
      <aside className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Project scaffold</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Navigation and placeholder routes are ready for future project work.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {['React', 'TypeScript', 'Tailwind CSS', 'Vite'].map((technology) => (
            <span
              key={technology}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {technology}
            </span>
          ))}
        </div>
      </aside>
    </section>
  )
}
