import * as tus from 'tus-js-client'

interface UploadCallbacks {
  onProgress: (percent: number) => void
  onProcessing: () => void
}

/**
 * Uploads a video file to Cloudflare Stream via the BJ upload endpoint.
 * Handles both TUS (>=200MB) and direct upload (<200MB) protocols,
 * then polls for processing completion.
 *
 * @returns The Cloudflare Stream video UID when ready.
 */
export async function uploadVideoToStream(
  file: File,
  callbacks: UploadCallbacks,
): Promise<string> {
  // 1. Get Direct Upload URL
  const urlRes = await fetch('/api/cloudflare-stream/bj-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: file.name, fileSize: file.size }),
  })

  if (!urlRes.ok) {
    const err = await urlRes.json()
    throw new Error(err.error || '업로드 URL 발급 실패')
  }

  const uploadData = await urlRes.json()
  let videoUid: string

  if (uploadData.useTus) {
    // TUS protocol upload (>=200MB)
    videoUid = await new Promise<string>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: uploadData.uploadURL,
        headers: uploadData.tusHeaders,
        chunkSize: 50 * 1024 * 1024,
        retryDelays: [0, 1000, 3000, 5000],
        metadata: {
          name: file.name,
          filetype: file.type,
          maxDurationSeconds: String(uploadData.maxDurationSeconds),
          ...uploadData.meta,
        },
        onError: (error) => {
          console.error('TUS upload error:', error)
          reject(new Error(error.message || '업로드 실패'))
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = Math.round((bytesUploaded / bytesTotal) * 100)
          callbacks.onProgress(pct)
        },
        onSuccess: () => {
          const uploadUrl = upload.url
          if (uploadUrl) {
            const uid = uploadUrl.split('/').pop() || ''
            resolve(uid)
          } else {
            reject(new Error('업로드 UID를 찾을 수 없습니다'))
          }
        },
      })

      upload.start()
    })
  } else {
    // Direct upload (<200MB)
    videoUid = uploadData.uid

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          callbacks.onProgress(pct)
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
      xhr.addEventListener('abort', () => reject(new Error('업로드 취소')))

      xhr.open('POST', uploadData.uploadURL)
      xhr.send(formData)
    })
  }

  // 2. Poll for processing completion
  callbacks.onProcessing()
  callbacks.onProgress(100)

  const maxAttempts = 120 // max 10 minutes (5s interval)
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    attempts++

    const res = await fetch(`/api/cloudflare-stream/${videoUid}`)
    if (!res.ok) continue

    const data = await res.json()

    if (data.status?.state === 'ready') {
      return videoUid
    }

    if (data.status?.state === 'error') {
      throw new Error(data.status.errorReasonText || '영상 처리 중 오류가 발생했습니다.')
    }
  }

  throw new Error('영상 처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')
}
