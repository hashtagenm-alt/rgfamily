export type ContentType = 'shorts' | 'vod'

export interface Media {
  id: number
  title: string
  description: string
  contentType: ContentType
  videoUrl: string
  thumbnailUrl: string
  vimeoId: string | null
  unit: 'excel' | 'crew' | null
  isFeatured: boolean
  isPublished: boolean
  createdAt: string
  parentId: number | null
  partNumber: number
  totalParts: number
  duration: number | null
}

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

// Convert URL to embed URL (YouTube or Vimeo)
export const getEmbedUrl = (url: string, vimeoId?: string | null) => {
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}`
  }
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`
  }
  return url
}
