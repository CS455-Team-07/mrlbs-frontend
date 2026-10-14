import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getScopeForEmail } from '../config/adminConfig'

export function AppHeader() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const dashboardPath =
    user?.role?.toLowerCase() === 'admin' ? '/admin' : '/member'

  const adminScope = user?.role === 'admin' && user?.email
    ? getScopeForEmail(user.email)
    : null

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
    }`

  function handleLogout() {
    void logout().finally(() => navigate('/login', { replace: true }))
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Left: hamburger + branding */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user && (
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              className="grid size-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen
                  ? <path d="M18 6 6 18M6 6l12 12" />
                  : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          )}

          <NavLink to="/" className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-700 text-xs font-bold text-white">MR</span>
            <span>
              <span className="block text-sm font-bold text-slate-900">MRLBS</span>
              <span className="hidden text-xs text-slate-500 sm:block">Multi-Resource Booking System</span>
            </span>
          </NavLink>
        </div>

        {/* Right: user info + logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isAuthenticated && user ? (
            <>
              {/* Scope badge for admins */}
              {adminScope && (
                <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 sm:inline-flex">
                  {adminScope.scopeLabel}
                </span>
              )}

              <button
                type="button"
                onClick={() => navigate('/profile')}
                aria-label="Open profile"
                title="Profile"
                className="grid size-10 place-items-center overflow-hidden rounded-full border border-blue-200 bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  user.name?.charAt(0).toUpperCase() || 'U'
                )}
              </button>

              <div className="hidden text-right sm:block">
                <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs capitalize text-slate-500">{user.role}</p>
              </div>

              <button
                type="button"
                id="sign-out-btn"
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Sign in
            </NavLink>
          )}
        </div>
      </div>

      {/* Hamburger dropdown */}
      {menuOpen && isAuthenticated && user && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 top-[68px] z-40 cursor-default bg-black/10"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute left-4 top-[60px] z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:left-6">
            <p className="px-4 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Navigation</p>

            <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>Home</NavLink>
            <NavLink to={dashboardPath} className={linkClass} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
            <NavLink to="/member/history" className={linkClass} onClick={() => setMenuOpen(false)}>Booking History</NavLink>
            <NavLink to="/profile" className={linkClass} onClick={() => setMenuOpen(false)}>Profile</NavLink>

            {adminScope && (
              <>
                <div className="my-2 border-t border-slate-100" />
                <p className="px-4 py-1.5 text-xs font-semibold text-slate-400">Scope</p>
                <p className="px-4 py-1 text-xs font-medium text-blue-700">{adminScope.scopeLabel}</p>
              </>
            )}

            <div className="my-2 border-t border-slate-100" />
            <button
              type="button"
              onClick={() => { setMenuOpen(false); handleLogout() }}
              className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </nav>
        </>
      )}
    </header>
  )
}
