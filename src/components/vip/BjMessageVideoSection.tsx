'use client'

import Image from 'next/image'
import { Video, Upload, Loader2, Trash2, Link as LinkIcon, Film } from 'lucide-react'
import type { VideoUploadMode, VideoProcessingStatus } from './useBjMessageForm'
import styles from './BjMessageForm.module.css'

interface BjMessageVideoSectionProps {
  videoUploadMode: VideoUploadMode
  videoProcessingStatus: VideoProcessingStatus
  previewUrl: string | null
  isUploading: boolean
  uploadProgress: number
  contentUrl: string
  contentText: string
  isSubmitting: boolean
  videoInputRef: React.RefObject<HTMLInputElement | null>
  onVideoModeChange: (mode: VideoUploadMode) => void
  onVideoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveVideo: () => void
  onContentUrlChange: (value: string) => void
  onContentTextChange: (value: string) => void
}

export default function BjMessageVideoSection({
  videoUploadMode,
  videoProcessingStatus,
  previewUrl,
  isUploading,
  uploadProgress,
  contentUrl,
  contentText,
  isSubmitting,
  videoInputRef,
  onVideoModeChange,
  onVideoFileChange,
  onRemoveVideo,
  onContentUrlChange,
  onContentTextChange,
}: BjMessageVideoSectionProps) {
  return (
    <>
      {/* File/URL mode toggle */}
      <div className={styles.videoModeToggle}>
        <button
          type="button"
          className={`${styles.modeBtn} ${videoUploadMode === 'file' ? styles.activeModeBtn : ''}`}
          onClick={() => onVideoModeChange('file')}
          disabled={isSubmitting || isUploading}
        >
          <Upload size={16} />
          <span>파일 업로드</span>
        </button>
        <button
          type="button"
          className={`${styles.modeBtn} ${videoUploadMode === 'url' ? styles.activeModeBtn : ''}`}
          onClick={() => onVideoModeChange('url')}
          disabled={isSubmitting || isUploading}
        >
          <LinkIcon size={16} />
          <span>YouTube URL</span>
        </button>
      </div>

      {/* File upload mode */}
      {videoUploadMode === 'file' && (
        <div className={styles.inputGroup}>
          <label className={styles.label}>영상 파일</label>

          {previewUrl && videoProcessingStatus === 'done' ? (
            <div className={styles.videoPreviewWrapper}>
              <div className={styles.videoThumbnail}>
                <Image
                  src={previewUrl}
                  alt="영상 썸네일"
                  width={320}
                  height={180}
                  className={styles.thumbnailImage}
                  unoptimized
                />
                <div className={styles.videoPlayIcon}>
                  <Film size={32} />
                </div>
              </div>
              <div className={styles.videoInfo}>
                <span className={styles.videoStatus}>업로드 완료</span>
              </div>
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={onRemoveVideo}
                disabled={isSubmitting}
              >
                <Trash2 size={16} />
                <span>삭제</span>
              </button>
            </div>
          ) : (
            <div
              className={`${styles.uploadArea} ${isUploading ? styles.uploading : ''}`}
              onClick={() => !isUploading && videoInputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 size={32} className={styles.spinner} />
                  <span className={styles.uploadText}>
                    {videoProcessingStatus === 'uploading' && `업로드 중... ${uploadProgress}%`}
                    {videoProcessingStatus === 'processing' && '영상 처리 중...'}
                  </span>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  {videoProcessingStatus === 'processing' && (
                    <span className={styles.uploadHint}>Cloudflare에서 처리 중입니다</span>
                  )}
                </>
              ) : (
                <>
                  <Video size={32} />
                  <span className={styles.uploadText}>클릭하여 영상 선택</span>
                  <span className={styles.uploadHint}>MP4, WebM, MOV</span>
                </>
              )}
            </div>
          )}

          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={onVideoFileChange}
            className={styles.hiddenInput}
            disabled={isSubmitting || isUploading}
          />
        </div>
      )}

      {/* YouTube URL mode */}
      {videoUploadMode === 'url' && (
        <div className={styles.inputGroup}>
          <label className={styles.label}>YouTube URL</label>
          <input
            type="url"
            className={styles.input}
            placeholder="https://youtube.com/watch?v=... 또는 https://youtu.be/..."
            value={contentUrl}
            onChange={(e) => onContentUrlChange(e.target.value)}
            disabled={isSubmitting || isUploading}
          />
          <span className={styles.hint}>
            YouTube 영상 링크를 입력하세요
          </span>
        </div>
      )}

      <div className={styles.inputGroup}>
        <label className={styles.label}>함께 전할 메시지 (선택)</label>
        <textarea
          className={styles.textareaSmall}
          placeholder="영상과 함께 전할 짧은 메시지..."
          value={contentText}
          onChange={(e) => onContentTextChange(e.target.value)}
          maxLength={500}
          disabled={isSubmitting || isUploading}
        />
      </div>
    </>
  )
}
