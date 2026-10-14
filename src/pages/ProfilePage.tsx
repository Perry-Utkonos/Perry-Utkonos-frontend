import { useState } from 'react'
import { ChevronRight, Crown, Edit3, MapPin, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { me } from '../data/users'
import CentaurIcon from '../components/CentaurIcon'

export default function ProfilePage() {
  const [premium, setPremium] = useState(false)
  const [photoHint, setPhotoHint] = useState(false)

  return (
    <section className="page own-profile-page">
      <header className="page-header profile-page-header"><h1>Профиль</h1><CentaurIcon monochrome className="profile-header-centaur" /><Link className="icon-button" to="/settings" aria-label="Открыть настройки"><Settings size={19} /></Link></header>
      <div className="own-profile-card">
        <div className="own-photo"><img src={me.photos[0]} alt={me.name} /><button aria-label="Изменить фото" onClick={() => setPhotoHint((show) => !show)}><Edit3 size={15} /></button></div>
        {photoHint && <p className="profile-inline-hint">Фото в демо-профиле нельзя заменить.</p>}
        <h2>{me.name}, {me.age}</h2><p className="profile-location"><MapPin size={15} />{me.city}</p>
        <p className="own-bio">{me.bio}</p>
        <div className="interest-list detail-interests">{me.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
        <div className="profile-zodiac">✧ {me.sign}</div>
      </div>
      <button className={`premium-card${premium ? ' premium-active' : ''}`} onClick={() => setPremium(!premium)}>
        <span className="premium-icon"><Crown size={20} /></span><span><strong>{premium ? 'Предпросмотр Premium активен' : 'Открыть расширенные возможности'}</strong><small>{premium ? 'Демонстрационный режим включён' : 'Больше знакомств и деталей о совместимости'}</small></span><ChevronRight size={18} />
      </button>
    </section>
  )
}
