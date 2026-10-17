import { flushSync } from 'react-dom'
import { NavLink, useLocation, useNavigate, useResolvedPath, type NavLinkProps } from 'react-router-dom'
import { transitionToPage } from './pageTransition'

// Both snapshots animate together; navigation never waits for an exit animation.
export default function TabLink(props: NavLinkProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const destination = useResolvedPath(props.to, { relative: props.relative })
  return <NavLink {...props} onClick={(event) => {
    props.onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.reloadDocument || (props.target && props.target !== '_self')) return
    if (location.pathname === destination.pathname && location.search === destination.search && location.hash === destination.hash) return
    event.preventDefault()
    transitionToPage(() => {
      flushSync(() => navigate(props.to, { replace: props.replace, state: props.state, relative: props.relative, preventScrollReset: props.preventScrollReset }))
    })
  }} />
}
