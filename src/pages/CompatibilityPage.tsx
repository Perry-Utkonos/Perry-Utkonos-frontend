import { ArrowLeft, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { me } from '../data/users'
import type { User } from '../types'
import CentaurIcon from '../components/CentaurIcon'

interface CompatibilityPageProps {
  user: User
}

export default function CompatibilityPage({ user }: CompatibilityPageProps) {
  const navigate = useNavigate()
  const sharedInterests = user.interests.filter((interest) => me.interests.includes(interest))
  return (
    <section className="page compatibility-page">
      <header className="page-header"><button className="icon-button" onClick={() => navigate(-1)} aria-label="Назад"><ArrowLeft size={20} /></button><p className="header-title">Ваша совместимость</p><span className="header-spacer" /></header>
      <div className="compat-hero">
        <div className="compat-photos"><img src={me.photos[0]} alt="Ваше фото" /><span><CentaurIcon monochrome /></span><img src={user.photos[0]} alt={`Фото ${user.name}`} /></div>
        <p className="eyebrow">{me.name} + {user.name}</p>
        <div className="score-ring"><div><strong>{user.compatibility}%</strong><span>совпадение</span></div></div>
        <h1>{user.compatibility >= 85 ? 'Высокая совместимость' : 'Есть о чём узнать'}</h1>
        <p className="compat-summary">Похоже, у вас с {user.name} есть общая искра — вот что говорит ваша пара.</p>
      </div>
      <div className="compat-breakdown">
        <article className="compat-detail-card"><span className="breakdown-icon"><Sparkles size={19} /></span><div><strong>Общие интересы</strong><p>{sharedInterests.length ? `Вам обоим близки ${sharedInterests.slice(0, 2).join(' и ').toLowerCase()}. Это отличный повод начать разговор.` : 'Разные увлечения — ещё один повод делиться открытиями.'}</p><div className="interest-list">{sharedInterests.map((interest) => <span key={interest}>{interest}</span>)}</div></div></article>
        <article className="compat-detail-card"><span className="breakdown-icon zodiac">✧</span><div><strong>Звёздный дуэт</strong><p>{user.sign} и {me.sign} умеют находить красоту в деталях. Важны искренность, лёгкость и пространство для двоих.</p><span className="zodiac-chips">{user.sign} <i>✦</i> {me.sign}</span></div></article>
      </div>
      <Link className="button button-primary button-wide reading-cta" to="/subscription">Узнать подробный расклад</Link>
      <p className="disclaimer">Совместимость — лёгкая подсказка для знакомства, а не предсказание.</p>
    </section>
  )
}
