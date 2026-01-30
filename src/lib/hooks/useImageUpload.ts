import { useCallback, useState } from 'react'
import { useSupabaseContext } from '@/lib/context'

interface UseImageUploadOptions {
  /** 저장 폴더 경로 (예: 'posts', 'notices') */
  folder: string
  /** 최대 파일 크기 (bytes, 기본: 10MB) */
  maxSize?: number
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

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * 이미지 업로드 훅
 * Supabase Storage에 이미지를 업로드하고 공개 URL을 반환
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
    maxSize = DEFAULT_MAX_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    onError,
  } = options

  const supabase = useSupabaseContext()
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

      // 파일 크기 검증
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024))
        const message = `파일이 너무 큽니다. ${maxSizeMB}MB 이하의 이미지만 업로드 가능합니다.`
        setError(message)
        onError?.(message)
        return null
      }

      // 파일명 생성 (충돌 방지)
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 9)
      const fileName = `${timestamp}-${randomStr}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('이미지 업로드 실패:', uploadError)
        const message = '이미지 업로드에 실패했습니다. 다시 시도해주세요.'
        setError(message)
        onError?.(message)
        return null
      }

      // 공개 URL 반환
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err) {
      console.error('이미지 업로드 오류:', err)
      const message = '이미지 업로드 중 오류가 발생했습니다.'
      setError(message)
      onError?.(message)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [supabase, folder, maxSize, allowedTypes, onError])

  return {
    uploadImage,
    isUploading,
    error,
    clearError,
  }
}
