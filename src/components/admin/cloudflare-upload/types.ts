export interface CloudflareUploadResult {
  uid: string
  thumbnailUrl: string | null
  thumbnailTime: string | null // 선택된 썸네일 시간 (예: "5s")
  duration: number
}

export interface CloudflareVideoUploadProps {
  onUploadComplete: (result: CloudflareUploadResult) => void
  onError?: (error: string) => void
  maxSize?: number // MB 단위
  disabled?: boolean
  /** 썸네일 선택 건너뛰기 (기본 썸네일 사용) */
  skipThumbnailSelection?: boolean
}

export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'selecting_thumbnail' | 'success' | 'error'

export interface ThumbnailOption {
  time: string
  url: string
}

export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

// 썸네일 생성 시간대 (영상 길이 비율)
export const THUMBNAIL_TIME_RATIOS = [0, 0.1, 0.25, 0.5, 0.75, 0.9]

// 200MB 이상 파일은 TUS 사용 (청크 업로드)
export const TUS_THRESHOLD = 200 * 1024 * 1024 // 200MB
