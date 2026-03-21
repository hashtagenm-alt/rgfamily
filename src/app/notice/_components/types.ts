export interface NoticeItem {
  id: number
  title: string
  isPinned: boolean
  isImportant: boolean
  createdAt: string
  author: string
  viewCount: number
  category: string
  thumbnailUrl: string | null
  displayOrder: number | null
}

export function isNew(dateStr: string): boolean {
  const postDate = new Date(dateStr)
  const now = new Date()
  const diffDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 3
}
