import type { Theme } from '../theme'

const choices: { value: Theme; image: string; label: string }[] = [
  { value: 'purple', image: '/images/brwn-wht.png', label: 'Тёмно-фиолетовая тема' },
  { value: 'cream', image: '/images/pink-wht-gray.png', label: 'Кремовая тема' },
]

export default function ThemePicker({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return <div className="theme-picker" role="group" aria-label="Выбор темы">
    {choices.map(({ value, image, label }) => <button className={`theme-choice${theme === value ? ' selected' : ''}`} key={value} type="button" onClick={() => onChange(value)} aria-label={label} aria-pressed={theme === value} title={label}><img src={image} alt="" /><span>{value === 'purple' ? 'Фиолетовая' : 'Кремовая'}</span></button>)}
  </div>
}
