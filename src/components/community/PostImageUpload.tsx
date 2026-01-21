'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import styles from './PostImageUpload.module.css'

interface PostImageUploadProps {
  onImageInsert: (markdownImg: string) => void
  disabled?: boolean
}

export function PostImageUpload({ onImageInsert, disabled }: PostImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('이미지 크기는 10MB 이하여야 합니다.')
      return
    }

    // 이미지 타입 체크
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'posts')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드 실패')
      }

      // 업로드 성공 시 마크다운 이미지 삽입
      const markdownImg = `![이미지](${data.url})`
      onImageInsert(markdownImg)
      setUploadedImages(prev => [...prev, data.url])
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const removeImage = (url: string) => {
    setUploadedImages(prev => prev.filter(img => img !== url))
  }

  return (
    <div className={styles.container}>
      <div className={styles.uploadArea}>
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 size={18} className={styles.spinner} />
              <span>업로드 중...</span>
            </>
          ) : (
            <>
              <ImagePlus size={18} />
              <span>이미지 첨부</span>
            </>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className={styles.input}
          disabled={disabled || isUploading}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {uploadedImages.length > 0 && (
        <div className={styles.preview}>
          <p className={styles.previewLabel}>업로드된 이미지</p>
          <div className={styles.imageGrid}>
            {uploadedImages.map((url, index) => (
              <div key={index} className={styles.imageItem}>
                <Image
                  src={url}
                  alt={`업로드 이미지 ${index + 1}`}
                  width={80}
                  height={80}
                  style={{ objectFit: 'cover' }}
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeImage(url)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
