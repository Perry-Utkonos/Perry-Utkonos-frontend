const clockFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const shortDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const longDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const fullDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

function parse(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function chatDayKey(value: string) {
  const date = parse(value)
  return date ? dayKey(date) : null
}

// Message bubbles always show a 24-hour clock, including messages from past days.
export function formatMessageTime(value: string | null) {
  const date = parse(value)
  return date ? clockFormat.format(date) : ''
}

export function formatConversationTime(value: string | null, now = new Date()) {
  const date = parse(value)
  if (!date) return ''
  if (dayKey(date) === dayKey(now)) return clockFormat.format(date)
  return (date.getFullYear() === now.getFullYear() ? shortDateFormat : fullDateFormat).format(date)
}

export function formatMessageDate(value: string, now = new Date()) {
  const date = parse(value)
  if (!date) return ''
  return (date.getFullYear() === now.getFullYear() ? longDateFormat : fullDateFormat).format(date)
}
