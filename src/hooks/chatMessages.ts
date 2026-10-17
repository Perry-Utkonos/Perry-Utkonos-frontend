import type { MessageDto, MessagePage } from '../api/contracts'

export function mergeMessages(current: MessageDto[], incoming: MessageDto[]) {
  const merged = new Map(current.map((message) => [message.id, message]))
  incoming.forEach((message) => merged.set(message.id, message))
  return [...merged.values()].sort((a, b) => a.seq - b.seq)
}

// A reconnect can miss more than one history page. Walk backwards until the
// fresh history reaches our last known sequence; initial loads stay paginated.
export async function fetchCatchup(loadPage: (before?: number) => Promise<MessagePage>, knownSeq = 0) {
  const firstPage = await loadPage()
  let page = firstPage
  let items = mergeMessages([], page.items)
  let before: number | undefined
  while (knownSeq > 0 && page.hasMore && Math.min(...items.map((item) => item.seq)) > knownSeq + 1) {
    const cursor = page.nextCursor
    if (!Number.isSafeInteger(cursor) || cursor == null || cursor <= 0 || (before != null && cursor >= before) || !page.items.length) {
      throw new Error('Сервер вернул некорректный курсор истории сообщений. Повторите загрузку.')
    }
    before = cursor
    page = await loadPage(cursor)
    if (page.items.length && Math.min(...page.items.map((item) => item.seq)) >= cursor) {
      throw new Error('Сервер не вернул предыдущую страницу истории сообщений. Повторите загрузку.')
    }
    items = mergeMessages(items, page.items)
  }
  return { items, firstPage }
}

export function createMessageId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
