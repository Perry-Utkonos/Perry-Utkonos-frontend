import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

export default function RouteTransition() {
  return <div className="route-stage">
    <div className="route-content" data-route-content>
      <Suspense fallback={<div className="route-loading" role="status">Загрузка…</div>}><Outlet /></Suspense>
    </div>
    <div className="route-snapshot" data-route-snapshot aria-hidden="true" />
  </div>
}
