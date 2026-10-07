import { Outlet } from 'react-router-dom'

export function MemberLayout() {
  return (
    <section aria-label="Member area" className="flex flex-1 flex-col">
      <Outlet />
    </section>
  )
}
