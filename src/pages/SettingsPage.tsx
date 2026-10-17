import { useState } from 'react'
import { Bell, Check, ChevronRight, HelpCircle, ShieldCheck } from 'lucide-react'
import ThemePicker from '../components/ThemePicker'
import type { Theme } from '../theme'

export default function SettingsPage({ theme, onThemeChange }: { theme: Theme; onThemeChange: (theme: Theme) => void }) {
  const [helpOpen, setHelpOpen] = useState(false)

  return <section className="page settings-page">
    <header className="page-header"><h1>Настройки</h1></header>
    <section className="theme-settings" aria-label="Оформление"><h3>Тема оформления</h3><ThemePicker theme={theme} onChange={onThemeChange} /></section>
    <div className="settings-list">
      <button disabled><span><Bell size={17} /> Уведомления</span><small>Скоро</small><ChevronRight size={17} /></button>
      <button disabled><span><ShieldCheck size={17} /> Конфиденциальность</span><small>Скоро</small><ChevronRight size={17} /></button>
      <button onClick={() => setHelpOpen((value) => !value)} aria-expanded={helpOpen}><span><HelpCircle size={17} /> Помощь и поддержка</span><ChevronRight size={17} /></button>
      {helpOpen && <p className="settings-help"><Check size={14} /> Помощь: <a href="https://t.me/artimkaf" target="_blank" rel="noopener noreferrer">t.me/artimkaf</a></p>}
    </div>
  </section>
}
