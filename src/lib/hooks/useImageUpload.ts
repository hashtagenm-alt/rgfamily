import { useCallback, useState } from 'react'

interface UseImageUploadOptions {
  /** 저장 폴더 경로 (예: 'posts', 'notices') */
  folder: string
  /** 허용된 MIME 타입 */
  allowedTypes?: string[]
  /** 에러 콜백 */
  onError?: (message: string) => void
}

interface UseImageUploadReturn {
  /** 이미지 업로드 함수 (RichEditor의 onImageUpload에 전달) */
  uploadImage: (file: File) => Promise<string | null>
  /** 업로드 중 여부 */
  isUploading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 에러 초기화 */
  clearError: () => void
}

const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// 4MB 이하는 서버 경유, 그 이상은 presigned URL 직접 업로드
const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024

/**
 * 이미지 업로드 훅
 * - 4MB 이하: 서버 API를 통해 R2 업로드
 * - 4MB 초과: Presigned URL로 R2에 직접 업로드 (Vercel 제한 우회)
 *
 * @example
 * const { uploadImage, isUploading, error } = useImageUpload({
 *   folder: 'posts',
 *   onError: (msg) => alert(msg)
 * })
 *
 * <RichEditor onImageUpload={uploadImage} />
 */
export function useImageUpload(options: UseImageUploadOptions): UseImageUploadReturn {
  const {
    folder,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    onError,
  } = options

  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 큰 파일: Presigned URL로 직접 업로드
  const uploadWithPresignedUrl = async (file: File): Promise<string | null> => {
    // 1. Presigned URL 발급
    const params = new URLSearchParams({
      folder,
      filename: file.name,
      contentType: file.type,
    })

    const urlResponse = await fetch(`/api/upload?${params}`)
    const urlResult = await urlResponse.json()

    if (!urlResponse.ok) {
      throw new Error(urlResult.error || 'Presigned URL 발급 실패')
    }

    // 2. R2에 직접 업로드
    const uploadResponse = await fetch(urlResult.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    if (!uploadResponse.ok) {
      throw new Error('R2 직접 업로드 실패')
    }

    return urlResult.publicUrl
  }

  // 작은 파일: 서버 경유 업로드
  const uploadThroughServer = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '이미지 업로드에 실패했습니다.')
    }

    return result.url
  }

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setError(null)
    setIsUploading(true)

    try {
      // 파일 타입 검증
      if (!allowedTypes.includes(file.type)) {
        const typeNames = allowedTypes.map(t => t.replace('image/', '').toUpperCase()).join(', ')
        const message = `지원되지 않는 형식입니다. ${typeNames} 파일만 업로드 가능합니다.`
        setError(message)
        onError?.(message)
        return null
      }

      // 파일 크기에 따라 업로드 방식 선택
      if (file.size > DIRECT_UPLOAD_THRESHOLD) {
        // 4MB 초과: Presigned URL로 직접 업로드
        return await uploadWithPresignedUrl(file)
      } else {
        // 4MB 이하: 서버 경유 업로드
        return await uploadThroughServer(file)
      }
    } catch (err) {
      console.error('이미지 업로드 오류:', err)
      const message = err instanceof Error ? err.message : '이미지 업로드 중 오류가 발생했습니다.'
      setError(message)
      onError?.(message)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [folder, allowedTypes, onError])

  return {
    uploadImage,
    isUploading,
    error,
    clearError,
  }
}
