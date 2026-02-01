'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Play, AlertCircle } from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import styles from './FileUpload.module.css'

export interface UploadedFile {
  id?: number
  file_url: string
  file_name: string
  file_type: 'image' | 'video'
  file_size: number
  display_order: number
  // 로컬 상태 관리용
  localId?: string
  isUploading?: boolean
  uploadProgress?: number
  error?: string
}

interface FileUploadProps {
  files: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSize?: number // MB 단위
  disabled?: boolean
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES]

export default function FileUpload({
  files,
  onChange,
  maxFiles = 10,
  maxSize = 50, // 50MB
  disabled = false,
}: FileUploadProps) {
  const supabase = useSupabaseContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    const fileType: 'image' | 'video' = file.type.startsWith('image/') ? 'image' : 'video'
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `notice-attachments/${fileName}`

    const { error } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath)

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: fileType,
      file_size: file.size,
      display_order: files.length,
    }
  }

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    setUploadError(null)

    const newFiles = Array.from(fileList)

    // 파일 수 체크
    if (files.length + newFiles.length > maxFiles) {
      setUploadError(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`)
      return
    }

    // 유효성 검사
    for (const file of newFiles) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError(`지원하지 않는 파일 형식입니다: ${file.name}`)
        return
      }

    }

    // 로컬 미리보기 추가 (업로딩 상태)
    const localPreviews: UploadedFile[] = newFiles.map((file, idx) => ({
      localId: generateLocalId(),
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file_type: file.type.startsWith('image/') ? 'image' : 'video',
      file_size: file.size,
      display_order: files.length + idx,
      isUploading: true,
      uploadProgress: 0,
    }))

    const updatedFiles = [...files, ...localPreviews]
    onChange(updatedFiles)

    // 각 파일 업로드
    const uploadResults = await Promise.all(
      newFiles.map(async (file, idx) => {
        const result = await uploadFile(file)
        return { index: files.length + idx, result, localId: localPreviews[idx].localId }
      })
    )

    // 업로드 결과 반영
    const finalFiles = updatedFiles.map(f => {
      const uploadResult = uploadResults.find(r => r.localId === f.localId)
      if (!uploadResult) return f

      if (uploadResult.result) {
        return {
          ...uploadResult.result,
          display_order: f.display_order,
        }
      } else {
        return {
          ...f,
          isUploading: false,
          error: '업로드 실패',
        }
      }
    }).filter(f => !f.error) // 실패한 파일 제거

    onChange(finalFiles)
  }, [files, maxFiles, maxSize, onChange, supabase])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)

    if (disabled) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }, [disabled, handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragActive(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles)
    }
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = ''
  }

  const handleRemove = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
      .map((file, i) => ({ ...file, display_order: i }))
    onChange(updated)
  }

  return (
    <div className={styles.uploadContainer}>
      <span className={styles.uploadLabel}>첨부파일 (선택)</span>

      {/* 드롭존 */}
      <div
        className={`${styles.dropzone} ${isDragActive ? styles.dropzoneDragActive : ''} ${disabled ? styles.dropzoneDisabled : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <Upload size={32} className={styles.uploadIcon} />
        <p className={styles.uploadText}>
          파일을 드래그하거나 <strong>클릭</strong>하여 업로드
        </p>
        <p className={styles.uploadHint}>
          이미지(JPG, PNG, GIF, WebP) 또는 동영상(MP4, WebM) • 최대 {maxFiles}개
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {/* 에러 메시지 */}
      {uploadError && (
        <div className={styles.uploadError}>
          <AlertCircle size={14} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 미리보기 리스트 */}
      {files.length > 0 && (
        <div className={styles.previewList}>
          {files.map((file, index) => (
            <div key={file.localId || file.id || index} className={styles.previewItem}>
              <div className={styles.previewImageWrapper}>
                {file.file_type === 'image' ? (
                  <img
                    src={file.file_url}
                    alt={file.file_name}
                    className={styles.previewImage}
                  />
                ) : (
                  <>
                    <video
                      src={file.file_url}
                      className={styles.previewVideo}
                      muted
                    />
                    <div className={styles.videoOverlay}>
                      <Play size={20} />
                    </div>
                  </>
                )}

                {/* 순서 배지 */}
                <span className={styles.orderBadge}>{index + 1}</span>

                {/* 삭제 버튼 */}
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(index)}
                  disabled={file.isUploading}
                >
                  <X size={14} />
                </button>

                {/* 업로딩 오버레이 */}
                {file.isUploading && (
                  <div className={styles.uploadingOverlay}>
                    <div className={styles.spinner} />
                  </div>
                )}
              </div>

              <div className={styles.previewInfo}>
                <p className={styles.previewFileName}>{file.file_name}</p>
                <p className={styles.previewFileSize}>{formatFileSize(file.file_size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
