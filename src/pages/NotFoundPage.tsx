import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="my-auto rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold text-blue-700">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        Page not found
      </h1>
      <p className="mt-3 text-slate-600">
        That page doesn’t exist in this scaffold.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900"
      >
        Return to home
      </Link>
    </section>
  )
}
