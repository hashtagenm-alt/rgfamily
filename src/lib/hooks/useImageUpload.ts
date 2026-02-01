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

/**
 * 이미지 업로드 훅
 * /api/upload API를 통해 Cloudinary에 이미지를 업로드하고 URL을 반환
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

      // FormData 생성
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      // /api/upload로 업로드 (Cloudinary 사용)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        const message = result.error || '이미지 업로드에 실패했습니다.'
        console.error('이미지 업로드 실패:', result)
        setError(message)
        onError?.(message)
        return null
      }

      // Cloudinary URL 반환
      return result.url
    } catch (err) {
      console.error('이미지 업로드 오류:', err)
      const message = '이미지 업로드 중 오류가 발생했습니다.'
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
