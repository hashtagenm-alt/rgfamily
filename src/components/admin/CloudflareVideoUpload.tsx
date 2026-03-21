'use client'

import styles from './VideoUpload.module.css'
import {
  useCloudflareUpload,
  UploadDropzone,
  UploadProgress,
  ProcessingProgress,
  ThumbnailSelector,
  UploadSuccess,
  UploadError,
  ACCEPTED_VIDEO_TYPES,
} from './cloudflare-upload'
import type { CloudflareVideoUploadProps } from './cloudflare-upload'

export type { CloudflareVideoUploadProps }

export default function CloudflareVideoUpload({
  onUploadComplete,
  onError,
  maxSize = 30000,
  disabled = false,
  skipThumbnailSelection = false,
}: CloudflareVideoUploadProps) {
  const {
    fileInputRef,
    isDragActive,
    uploadProgress,
    processingProgress,
    uploadStatus,
    errorMessage,
    selectedFile,
    isTusUpload,
    canResume,
    thumbnailOptions,
    selectedThumbnailIndex,
    setSelectedThumbnailIndex,
    thumbnailLoadErrors,
    setThumbnailLoadErrors,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleClick,
    handleInputChange,
    handleReset,
    handleResumeUpload,
    handleThumbnailSelect,
    handleSkipThumbnailSelection,
  } = useCloudflareUpload({
    onUploadComplete,
    onError,
    maxSize,
    skipThumbnailSelection,
  })

  return (
    <div className={styles.container}>
      {uploadStatus === 'idle' && (
        <UploadDropzone
          isDragActive={isDragActive}
          disabled={disabled}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        />
      )}

      {uploadStatus === 'uploading' && selectedFile && (
        <UploadProgress
          file={selectedFile}
          uploadProgress={uploadProgress}
          isTusUpload={isTusUpload}
        />
      )}

      {uploadStatus === 'processing' && selectedFile && (
        <ProcessingProgress
          file={selectedFile}
          processingProgress={processingProgress}
        />
      )}

      {uploadStatus === 'selecting_thumbnail' && selectedFile && (
        <ThumbnailSelector
          thumbnailOptions={thumbnailOptions}
          selectedThumbnailIndex={selectedThumbnailIndex}
          thumbnailLoadErrors={thumbnailLoadErrors}
          onSelectIndex={setSelectedThumbnailIndex}
          onLoadError={(index) => setThumbnailLoadErrors((prev) => new Set(prev).add(index))}
          onConfirm={handleThumbnailSelect}
          onSkip={handleSkipThumbnailSelection}
        />
      )}

      {uploadStatus === 'success' && selectedFile && (
        <UploadSuccess
          fileName={selectedFile.name}
          onReset={handleReset}
        />
      )}

      {uploadStatus === 'error' && (
        <UploadError
          errorMessage={errorMessage}
          canResume={canResume}
          onResume={handleResumeUpload}
          onReset={handleReset}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
