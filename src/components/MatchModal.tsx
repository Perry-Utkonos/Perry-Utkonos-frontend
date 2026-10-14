import { ArrowRight, MessageCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { me } from '../data/users'
import type { User } from '../types'
import CentaurIcon from './CentaurIcon'

interface MatchModalProps {
  user: User
  onClose: () => void
  onContinue: () => void
}

export default function MatchModal({ user, onClose, onContinue }: MatchModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="match-modal" role="dialog" aria-modal="true" aria-labelledby="match-title">
        <button className="icon-button modal-close" onClick={onClose} aria-label="Закрыть"><X size={19} /></button>
        <div className="match-sparkle"><CentaurIcon monochrome /></div>
        <h2 id="match-title">Это взаимно</h2>
        <p className="match-copy">Вы с {user.name} понравились друг другу.</p>
        <div className="match-avatars">
          <img src={me.photos[0]} alt="Ваше фото" />
          <span><CentaurIcon monochrome /></span>
          <img src={user.photos[0]} alt={`Фото: ${user.name}`} />
        </div>
        <div className="match-actions">
          <Link className="button button-primary" to={`/chat/${user.id}`} onClick={onClose}><MessageCircle size={17} /> Написать сообщение</Link>
          <button className="text-button" onClick={onContinue}>Продолжить смотреть анкеты <ArrowRight size={15} /></button>
        </div>
      </section>
    </div>
  )
}
