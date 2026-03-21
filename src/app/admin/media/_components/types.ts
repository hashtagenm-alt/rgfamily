export type ContentType = 'shorts' | 'vod'

export interface Media {
  id: number
  title: string
  description: string
  contentType: ContentType
  videoUrl: string
  thumbnailUrl: string
  cloudflareUid: string | null
  unit: 'excel' | 'crew' | null
  isFeatured: boolean
  isPublished: boolean
  createdAt: string
  parentId: number | null
  partNumber: number
  totalParts: number
  duration: number | null
}

// Cloudflare 썸네일 시간 옵션 (초 단위)
export const THUMBNAIL_TIME_OPTIONS = [
  { value: '0s', label: '시작 (0초)' },
  { value: '5s', label: '5초' },
  { value: '10s', label: '10초' },
  { value: '15s', label: '15초' },
  { value: '30s', label: '30초' },
  { value: '60s', label: '1분' },
  { value: '120s', label: '2분' },
  { value: '300s', label: '5분' },
]

export const formatDuration = (seconds: number | null) => {
  if (!seconds) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Convert URL to embed URL (YouTube or Cloudflare)
export const getEmbedUrl = (url: string, cloudflareUid?: string | null) => {
  if (cloudflareUid) {
    return `https://iframe.videodelivery.net/${cloudflareUid}`
  }
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }
  return url
}
