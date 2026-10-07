export function MemberDashboard() {
  return (
    <DashboardPlaceholder
      role="Member"
      description="A future member dashboard will be built here."
    />
  )
}

function DashboardPlaceholder({
  role,
  description,
}: {
  role: string
  description: string
}) {
  return (
    <section className="my-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold text-blue-700">{role} area</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {role} dashboard placeholder
      </h1>
      <p className="mt-3 text-slate-600">{description}</p>
    </section>
  )
}
