import { useState } from 'react'
import { ArrowLeft, Check, Crown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const [complete, setComplete] = useState(false)

  return (
    <section className="page subscription-page">
      <header className="page-header">
        <button className="icon-button" onClick={() => navigate(-1)} aria-label="Назад"><ArrowLeft size={20} /></button>
        <h1>Подписка</h1>
        <span className="header-spacer" />
      </header>
      <div className="subscription-card">
        <span className="subscription-icon"><Crown size={22} /></span>
        <h2>Подробный расклад</h2>
        <p>Расклад на совместимость и отношения.</p>
        <div className="subscription-price"><strong>499 ₽</strong><span> / месяц</span></div>
        <ul>
          <li><Check size={16} /> Подробная трактовка расклада</li>
          <li><Check size={16} /> Совместимость вашей пары</li>
        </ul>
        <button className="button button-primary button-wide" onClick={() => setComplete(true)}>
          {complete ? 'Готово' : 'Оформить подписку'}
        </button>
      </div>
    </section>
  )
}
