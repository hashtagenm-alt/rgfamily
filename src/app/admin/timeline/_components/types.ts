import type { TimelineEvent as TimelineEventDB } from '@/types/database'

export type TimelineCategory = 'founding' | 'milestone' | 'event' | 'member'

export interface TimelineEventUI {
  id: number
  eventDate: string
  title: string
  description: string
  imageUrl: string | null
  category: TimelineCategory | null
  seasonId: number | null
  seasonName?: string
  createdAt: string
}

export const categoryLabels: Record<TimelineCategory, string> = {
  founding: '창단',
  milestone: '마일스톤',
  event: '이벤트',
  member: '멤버',
}

export const categoryColors: Record<TimelineCategory, string> = {
  founding: '#71717a',
  milestone: '#6b7280',
  event: '#52525b',
  member: '#8b8b8b',
}

export function fromDbFormat(row: TimelineEventDB): TimelineEventUI {
  return {
    id: row.id,
    eventDate: row.event_date,
    title: row.title,
    description: row.description || '',
    imageUrl: row.image_url,
    category: row.category as TimelineCategory | null,
    seasonId: row.season_id,
    createdAt: row.created_at,
  }
}

export const defaultEvent: Omit<TimelineEventUI, 'id' | 'createdAt'> = {
  eventDate: new Date().toISOString().split('T')[0],
  title: '',
  description: '',
  imageUrl: null,
  category: 'event',
  seasonId: null,
}

export function isFutureDate(dateStr: string): boolean {
  const eventDate = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return eventDate > today
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
