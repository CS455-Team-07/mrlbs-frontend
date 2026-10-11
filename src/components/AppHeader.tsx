import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/login', label: 'Login' },
  { to: '/member', label: 'Member' },
  { to: '/admin', label: 'Admin' },
]

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <NavLink to="/" className="flex items-center gap-3 text-slate-900">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-700 text-sm font-bold text-white">
            MR
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-wide">
              MRLBS
            </span>
            <span className="block text-xs text-slate-500">
              Lab booking system
            </span>
          </span>
        </NavLink>
        <nav aria-label="Main navigation" className="flex flex-wrap gap-1">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
