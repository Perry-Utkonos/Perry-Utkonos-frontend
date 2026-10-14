import { Sparkles } from 'lucide-react'

interface CompatibilityBadgeProps {
  score: number
}

export default function CompatibilityBadge({ score }: CompatibilityBadgeProps) {
  return (
    <span className="compatibility-badge">
      <Sparkles size={13} />
      {score}% совпадение
    </span>
  )
}
