import * as tus from 'tus-js-client'

/**
 * Vimeo TUS 업로드
 * Step 1: POST /api/vimeo/upload-url → { uploadUrl, vimeoId }
 * Step 2: tus-js-client로 uploadUrl에 TUS 업로드
 * Step 3: vimeoId 반환
 */
export async function uploadToVimeo(
  file: File,
  title: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  // Step 1: 업로드 URL 발급
  const res = await fetch('/api/vimeo/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, size: file.size }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Vimeo 업로드 URL 발급 실패')
  }

  const { uploadUrl, vimeoId } = await res.json()

  // Step 2: TUS 업로드
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      uploadUrl,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      chunkSize: 10 * 1024 * 1024, // 10MB
      removeFingerprintOnSuccess: true,
      metadata: { filename: file.name, filetype: file.type },
      onError: (error) => {
        reject(new Error(`업로드 실패: ${error.message || '네트워크 오류'}`))
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const pct = Math.round((bytesUploaded / bytesTotal) * 100)
        onProgress(pct)
      },
      onSuccess: () => {
        resolve()
      },
    })

    upload.start()
  })

  // Step 3: vimeoId 반환
  return vimeoId
}
