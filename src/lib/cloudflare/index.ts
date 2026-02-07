/**
 * Cloudflare Stream 설정 및 유틸리티
 */

// Server-side only (환경변수에 NEXT_PUBLIC_ 없음)
export const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ''
export const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''
export const CLOUDFLARE_STREAM_API = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`

export function getAuthHeaders() {
  return {
    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// --- Cloudflare Stream API 타입 ---

export interface CloudflareStreamVideo {
  uid: string
  thumbnail: string
  playback: {
    hls: string
    dash: string
  }
  status: {
    state: 'queued' | 'inprogress' | 'ready' | 'error'
    pctComplete: string
    errorReasonCode: string
    errorReasonText: string
  }
  duration: number
  meta: Record<string, string>
  created: string
  modified: string
  size: number
}

export interface CloudflareApiResponse<T> {
  result: T
  success: boolean
  errors: Array<{ code: number; message: string }>
  messages: Array<{ code: number; message: string }>
}

export interface DirectUploadResult {
  uploadURL: string
  uid: string
}

// --- URL 생성 유틸리티 ---

/** Cloudflare Stream iframe 재생 URL */
export function getStreamIframeUrl(uid: string): string {
  return `https://iframe.videodelivery.net/${uid}`
}

/** Cloudflare Stream HLS URL (고화질 강제 옵션 포함) */
export function getStreamHlsUrl(uid: string, options?: {
  clientBandwidthHint?: number  // Mbps 단위, 10이면 1080p 강제
}): string {
  const baseUrl = `https://videodelivery.net/${uid}/manifest/video.m3u8`
  if (options?.clientBandwidthHint) {
    return `${baseUrl}?clientBandwidthHint=${options.clientBandwidthHint}`
  }
  return baseUrl
}

/** Cloudflare Stream 썸네일 URL */
export function getStreamThumbnailUrl(
  uid: string,
  options?: { time?: string; width?: number; height?: number; fit?: 'crop' | 'clip' | 'scale' }
): string {
  const params = new URLSearchParams()
  if (options?.time) params.set('time', options.time)
  if (options?.width) params.set('width', String(options.width))
  if (options?.height) params.set('height', String(options.height))
  if (options?.fit) params.set('fit', options.fit)
  const query = params.toString()
  return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg${query ? '?' + query : ''}`
}

// --- Cloudflare Stream API 함수 (서버 전용) ---

/** Direct Creator Upload URL 발급 */
export async function createDirectUpload(options?: {
  maxDurationSeconds?: number
  meta?: Record<string, string>
}): Promise<DirectUploadResult> {
  const res = await fetch(`${CLOUDFLARE_STREAM_API}/direct_upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      maxDurationSeconds: options?.maxDurationSeconds || 21600, // 6시간 (Cloudflare 최대)
      meta: options?.meta || {},
    }),
  })

  const json: CloudflareApiResponse<DirectUploadResult> = await res.json()

  if (!json.success) {
    throw new Error(json.errors?.[0]?.message || 'Cloudflare Stream 업로드 URL 발급 실패')
  }

  return json.result
}

/** TUS Resumable Upload URL 발급 (대용량 파일용) */
export async function createTusUpload(options?: {
  maxDurationSeconds?: number
  meta?: Record<string, string>
}): Promise<DirectUploadResult> {
  // Cloudflare Stream TUS endpoint
  const res = await fetch(`${CLOUDFLARE_STREAM_API}?direct_user=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': '0', // Will be set by client
      'Upload-Metadata': options?.meta
        ? Object.entries(options.meta)
            .map(([k, v]) => `${k} ${Buffer.from(v).toString('base64')}`)
            .join(',')
        : '',
    },
  })

  // TUS endpoint returns Location header with upload URL
  const location = res.headers.get('Location') || res.headers.get('stream-media-id')
  const streamMediaId = res.headers.get('stream-media-id')

  if (!location && !streamMediaId) {
    // Fallback: use direct_upload with standard method
    return createDirectUpload(options)
  }

  return {
    uploadURL: location || `https://upload.videodelivery.net/tus/${streamMediaId}`,
    uid: streamMediaId || location?.split('/').pop() || '',
  }
}

/** 영상 상태 조회 */
export async function getVideoStatus(uid: string): Promise<CloudflareStreamVideo> {
  const res = await fetch(`${CLOUDFLARE_STREAM_API}/${uid}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  const json: CloudflareApiResponse<CloudflareStreamVideo> = await res.json()

  if (!json.success) {
    throw new Error(json.errors?.[0]?.message || '영상 상태 조회 실패')
  }

  return json.result
}

/** 영상 삭제 */
export async function deleteVideo(uid: string): Promise<void> {
  const res = await fetch(`${CLOUDFLARE_STREAM_API}/${uid}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!res.ok && res.status !== 404) {
    throw new Error('Cloudflare Stream 영상 삭제 실패')
  }
}
