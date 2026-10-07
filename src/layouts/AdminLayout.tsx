import { Outlet } from 'react-router-dom'

export function AdminLayout() {
  return (
    <section aria-label="Admin area" className="flex flex-1 flex-col">
      <Outlet />
    </section>
  )
}
