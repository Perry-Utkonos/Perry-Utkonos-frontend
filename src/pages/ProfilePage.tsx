import { useState, type FormEvent } from 'react'
import { ChevronRight, Crown, Edit3, MapPin, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import CentaurIcon from '../components/CentaurIcon'
import Avatar from '../components/Avatar'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api'
import { errorMessage, toUser } from '../api/profiles'

export default function ProfilePage() {
  const { profile, updateProfile, logout } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  if (!profile) return null
  const me = toUser(profile)
  const currentProfile = profile
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (name: string) => String(data.get(name) ?? '').trim()
    const list = (name: string) => [...new Set(field(name).split(/[,\n]/).map((item) => item.trim()).filter(Boolean))]
    setSaving(true); setError(null); setSaved(false)
    try {
      const next = await api.updateMe({ displayName: field('name'), birthDate: field('birthDate') || null, city: field('city'), bio: field('bio'), interests: list('interests'), goals: list('goals'), sign: field('sign') || null, photos: list('photos'), avatarUrl: field('avatarUrl') || null, gender: currentProfile.gender })
      updateProfile(next); setEditing(false); setSaved(true)
    } catch (cause) { setError(errorMessage(cause)) } finally { setSaving(false) }
  }
  return <section className="page own-profile-page">
    <header className="page-header profile-page-header"><h1>Профиль</h1><CentaurIcon monochrome className="profile-header-centaur" /><Link className="icon-button" to="/settings" aria-label="Открыть настройки"><Settings size={19} /></Link></header>
    {!editing ? <>
      <div className="own-profile-card">
        <div className="own-photo"><Avatar src={me.photos[0]} alt={me.name} /><button aria-label="Изменить анкету" onClick={() => { setEditing(true); setSaved(false) }}><Edit3 size={15} /></button></div>
        <h2>{me.name}{me.age !== null ? `, ${me.age}` : ''}</h2>{me.city && <p className="profile-location"><MapPin size={15} />{me.city}</p>}
        <p className="own-bio">{me.bio || 'Расскажите о себе, чтобы начать знакомство.'}</p>
        <div className="interest-list detail-interests">{me.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
        {me.sign && <div className="profile-zodiac">✧ {me.sign}</div>}
      </div>
      {saved && <p className="saved-notice" role="status">Анкета сохранена.</p>}
      <div className="account-actions"><button className="button button-subtle" onClick={() => setEditing(true)}>Редактировать анкету</button><button className="text-button" onClick={logout}>Выйти</button></div>
      <Link className="premium-card" to="/subscription"><span className="premium-icon"><Crown size={20} /></span><span><strong>Подробный расклад</strong><small>Узнать о подписке</small></span><ChevronRight size={18} /></Link>
    </> : <form className="profile-form" onSubmit={save}>
      <label>Имя<input name="name" defaultValue={profile.displayName ?? profile.username} required maxLength={80} disabled={saving} /></label>
      <label>Дата рождения<input name="birthDate" type="date" defaultValue={profile.birthDate?.slice(0, 10) ?? ''} disabled={saving} /><small>Знакомства доступны с 18 лет.</small></label>
      <label>Город<input name="city" defaultValue={profile.city} maxLength={120} disabled={saving} /></label>
      <label>О себе<textarea name="bio" defaultValue={profile.bio} maxLength={500} disabled={saving} /></label>
      <label>Интересы через запятую<input name="interests" defaultValue={profile.interests.join(', ')} maxLength={500} disabled={saving} /></label>
      <label>Цели знакомства через запятую<input name="goals" defaultValue={profile.goals.join(', ')} maxLength={500} disabled={saving} /></label>
      <label>Знак зодиака<select name="sign" defaultValue={profile.sign || ''} disabled={saving}><option value="">Не указан</option>{['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'].map((sign) => <option key={sign}>{sign}</option>)}</select></label>
      <label>Ссылка на аватар<input name="avatarUrl" inputMode="url" defaultValue={profile.avatarUrl ?? ''} disabled={saving} /></label>
      <label>Фотографии: ссылки, по одной на строку<textarea name="photos" defaultValue={profile.photos.join('\n')} disabled={saving} /><small>Прямая HTTPS-ссылка или путь /images/имя-файла.jpg для фотографии на этом сайте.</small></label>
      {error && <p className="api-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</button><button className="button button-subtle" type="button" disabled={saving} onClick={() => { setEditing(false); setError(null) }}>Отмена</button></div>
    </form>}
  </section>
}
