import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function LoginPage() {
  return (
    <PlaceholderPage
      eyebrow="Welcome"
      title="Login placeholder"
      description="The login experience will be added in a future project step."
    >
      <Link
        to="/"
        className="text-sm font-semibold text-blue-700 hover:text-blue-900"
      >
        Return to home
      </Link>
    </PlaceholderPage>
  )
}

function PlaceholderPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <section className="my-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold text-blue-700">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-slate-600">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}
