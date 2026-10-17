import { Sparkles } from 'lucide-react'

interface CompatibilityBadgeProps {
  score: number | null
}

export default function CompatibilityBadge({ score }: CompatibilityBadgeProps) {
  return (
    <span className="compatibility-badge">
      <Sparkles size={13} />
      {score === null ? 'Узнать совместимость' : `${score}% совпадение`}
    </span>
  )
}
