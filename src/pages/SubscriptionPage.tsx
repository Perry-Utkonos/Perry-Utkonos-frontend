import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Crown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { PaymentDto } from '../api/contracts'
import { errorMessage } from '../api/profiles'

export default function SubscriptionPage() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState<PaymentDto[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setBusy(true); setError(null)
    api.payments().then((result) => { if (active) setPayments(result) }).catch((cause) => { if (active) setError(errorMessage(cause)) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [revision])
  const existing = payments.find((payment) => payment.status.toLowerCase() === 'pending')
  async function requestPayment() {
    setBusy(true); setError(null)
    try {
      const payment = await api.createPayment()
      setPayments((current) => [payment, ...current])
      setNotice('Заявка сохранена. Онлайн-оплата пока недоступна; деньги не списаны.')
    } catch (cause) { setError(errorMessage(cause)) } finally { setBusy(false) }
  }
  return <section className="page subscription-page">
    <header className="page-header"><button className="icon-button" onClick={() => navigate(-1)} aria-label="Назад"><ArrowLeft size={20} /></button><h1>Подписка</h1><span className="header-spacer" /></header>
    <div className="subscription-card"><span className="subscription-icon"><Crown size={22} /></span><h2>Подробный расклад</h2><p>Расклад на совместимость и отношения.</p><div className="subscription-price"><strong>499 ₽</strong><span> / месяц</span></div><ul><li><Check size={16} /> Подробная трактовка расклада</li><li><Check size={16} /> Совместимость вашей пары</li></ul>
      <p className="api-notice">Онлайн-оплата и подробные расклады ещё готовятся. Можно сохранить заявку на подписку.</p>
      <button className="button button-primary button-wide" disabled={busy || Boolean(existing) || Boolean(error)} onClick={() => { void requestPayment() }}>{busy ? 'Подождите…' : existing ? 'Заявка сохранена' : 'Оставить заявку'}</button>
      {notice && <p className="api-notice" role="status">{notice}</p>}
      {error && <><p className="api-error" role="alert">{error}</p><button className="text-button" onClick={() => setRevision((value) => value + 1)}>Попробовать снова</button></>}
      {payments.length > 0 && <div className="payment-status"><h3>Ваши заявки</h3>{payments.map((payment) => <p key={payment.id}>{new Date(payment.createdAt).toLocaleDateString('ru-RU')} · {payment.amount} {payment.currency} · {payment.status.toLowerCase() === 'completed' ? 'Оплачено' : payment.status.toLowerCase() === 'pending' ? 'Ожидает оплаты' : payment.status}</p>)}</div>}
    </div>
  </section>
}
