type CentaurIconProps = { className?: string; monochrome?: boolean }

export default function CentaurIcon({ className = '', monochrome = false }: CentaurIconProps) {
  return <span className={`centaur-icon${monochrome ? ' monochrome' : ''}${className ? ` ${className}` : ''}`} aria-hidden="true" />
}
