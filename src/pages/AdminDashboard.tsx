import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <section className="my-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-slate-600">Please sign in to access the dashboard.</p>
      </section>
    )
  }

  return (
    <section className="my-auto mx-auto w-full max-w-3xl py-6 space-y-6">
      {/* Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.name}'s avatar`}
                className="h-24 w-24 rounded-full object-cover border-2 border-purple-200 shadow-sm"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center border-2 border-purple-200">
                <span className="text-3xl font-bold text-purple-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {user.name}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
              </div>
              <span className="rounded-full bg-purple-100 text-purple-800 border border-purple-300 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {user.role} role
              </span>
            </div>

            {/* Profile details */}
            <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {user.institutionalId && (
                <div>
                  <dt className="font-medium text-slate-500">
                    Institutional ID
                  </dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {user.institutionalId}
                  </dd>
                </div>
              )}
              {user.department && (
                <div>
                  <dt className="font-medium text-slate-500">Department</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {user.department}
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-slate-500">User ID</dt>
                <dd className="mt-0.5 font-mono text-xs text-slate-600">
                  {user.id}
                </dd>
              </div>
              {user.createdAt && (
                <div>
                  <dt className="font-medium text-slate-500">Member Since</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>

            {user.bio && (
              <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Bio</p>
                <p className="text-sm text-slate-700">{user.bio}</p>
              </div>
            )}

            <div className="mt-5">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-purple-700">Admin area</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Admin Dashboard
        </h2>
        <p className="mt-3 text-slate-600">
          Welcome, {user.name}! System administration tools, user management,
          and lab configuration will appear here.
        </p>
      </div>
    </section>
  )
}
