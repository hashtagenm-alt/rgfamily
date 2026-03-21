import * as tus from 'tus-js-client'
import { TUS_THRESHOLD } from './types'

export { TUS_THRESHOLD }

// 파일 크기에 따른 동적 청크 사이즈 (Cloudflare 권장: 50MB, 허용 범위: 5MB~200MB)
function getChunkSize(fileSize: number): number {
  if (fileSize <= 500 * 1024 * 1024) return 10 * 1024 * 1024   // ~500MB → 10MB 청크
  if (fileSize <= 2 * 1024 * 1024 * 1024) return 50 * 1024 * 1024  // ~2GB → 50MB 청크
  return 100 * 1024 * 1024  // >2GB → 100MB 청크
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// 재시도 헬퍼 (URL 발급 등 일회성 fetch에 사용)
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  const delays = [0, 2000, 5000]
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.ok || attempt === maxRetries) return res
      if (res.status >= 500) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delays[attempt] || 5000))
          continue
        }
      }
      return res
    } catch (err) {
      if (attempt === maxRetries) throw err
      await new Promise(r => setTimeout(r, delays[attempt] || 5000))
    }
  }
  throw new Error('최대 재시도 횟수 초과')
}

export interface UploadCallbacks {
  setUploadProgress: (pct: number) => void
  setCanResume: (v: boolean) => void
  tusUploadRef: React.RefObject<tus.Upload | null>
}

// TUS 업로드 (대용량 파일용 - 청크 업로드, 이어받기 지원)
export async function uploadWithTus(
  file: File,
  callbacks: UploadCallbacks,
): Promise<string> {
  const { setUploadProgress, setCanResume, tusUploadRef } = callbacks

  const urlRes = await fetchWithRetry('/api/cloudflare-stream/tus-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadLength: file.size, filename: file.name }),
  })

  if (!urlRes.ok) {
    const err = await urlRes.json()
    throw new Error(err.error || 'TUS 업로드 URL 발급 실패')
  }

  const { uploadURL, uid } = await urlRes.json()
  const chunkSize = getChunkSize(file.size)

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      uploadUrl: uploadURL,
      retryDelays: [0, 1000, 3000, 5000, 10000, 15000, 30000],
      chunkSize,
      removeFingerprintOnSuccess: true,
      metadata: { filename: file.name, filetype: file.type },
      onError: (error) => {
        setCanResume(true)
        reject(new Error(`업로드 실패: ${error.message || '네트워크 오류'}`))
      },
      onShouldRetry: (err, retryAttempt) => {
        const status = (err as tus.DetailedError).originalResponse?.getStatus()
        if (status && status >= 400 && status < 500) return false
        console.warn(`TUS retry attempt ${retryAttempt}, status: ${status || 'unknown'}`)
        return true
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const pct = Math.round((bytesUploaded / bytesTotal) * 100)
        setUploadProgress(pct)
      },
      onSuccess: () => {
        tusUploadRef.current = null
        setCanResume(false)
        resolve(uid)
      },
    })

    tusUploadRef.current = upload

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0])
      }
      upload.start()
    })
  })
}

// 일반 업로드 (작은 파일용, 재시도 포함)
export async function uploadWithXhr(
  file: File,
  callbacks: Pick<UploadCallbacks, 'setUploadProgress'>,
): Promise<string> {
  const { setUploadProgress } = callbacks

  const urlRes = await fetchWithRetry('/api/cloudflare-stream/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: file.name }),
  })

  if (!urlRes.ok) {
    const err = await urlRes.json()
    throw new Error(err.error || '업로드 URL 발급 실패')
  }

  const { uploadURL, uid } = await urlRes.json()

  const MAX_XHR_RETRIES = 2
  const XHR_TIMEOUT = 5 * 60 * 1000

  for (let attempt = 0; attempt <= MAX_XHR_RETRIES; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('file', file)

        xhr.timeout = XHR_TIMEOUT

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(pct)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`업로드 실패 (${xhr.status})`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('네트워크 오류')))
        xhr.addEventListener('timeout', () => reject(new Error('업로드 시간 초과')))
        xhr.addEventListener('abort', () => reject(new Error('업로드 취소')))

        xhr.open('POST', uploadURL)
        xhr.send(formData)
      })
      return uid
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      if (message === '업로드 취소') throw err
      if (attempt === MAX_XHR_RETRIES) throw err
      setUploadProgress(0)
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  return uid
}

// 영상 처리 상태 폴링
export async function pollVideoStatus(
  uid: string,
  setProcessingProgress: (v: string) => void,
): Promise<{ uid: string; duration: number }> {
  const maxAttempts = 120
  let attempts = 0
  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 5

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    attempts++

    try {
      const res = await fetch(`/api/cloudflare-stream/${uid}`)
      if (!res.ok) {
        consecutiveErrors++
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          throw new Error(`상태 확인 ${MAX_CONSECUTIVE_ERRORS}회 연속 실패 (HTTP ${res.status})`)
        }
        continue
      }

      consecutiveErrors = 0
      const data = await res.json()

      if (data.status?.state === 'ready') {
        return { uid, duration: data.duration || 0 }
      }

      if (data.status?.state === 'error') {
        throw new Error(data.status.errorReasonText || '영상 처리 중 오류가 발생했습니다.')
      }

      setProcessingProgress(data.status?.pctComplete || '0')
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        consecutiveErrors++
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          throw new Error('네트워크 연결을 확인해주세요. 영상은 이미 업로드되었을 수 있습니다.')
        }
        continue
      }
      throw err
    }
  }

  throw new Error('영상 처리 시간이 초과되었습니다. 나중에 다시 확인해주세요.')
}
