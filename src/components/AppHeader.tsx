import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function AppHeader() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        {/* Logo / Home */}
        <NavLink
          to="/"
          className="flex items-center gap-3"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-blue-700 text-xs font-bold text-white">
            MR
          </span>

          <div>
            <p className="text-sm font-bold text-slate-900">
              MRLBS
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">
              Multi-Resource Lab Booking System
            </p>
          </div>
        </NavLink>

        {/* Navigation */}
        <nav className="flex items-center gap-2 sm:gap-4">

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            Home
          </NavLink>

          {isAuthenticated && user && (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                Profile
              </NavLink>

              {/* User information */}
              <div className="hidden items-center gap-2 border-l border-slate-200 pl-4 sm:flex">
                <div className="text-right">
                  <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900">
                    {user.name}
                  </p>

                  <p className="text-xs capitalize text-slate-500">
                    {user.role}
                  </p>
                </div>
              </div>

              {/* Exit */}
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Exit
              </button>
            </>
          )}

        </nav>
      </div>
    </header>
  )
}