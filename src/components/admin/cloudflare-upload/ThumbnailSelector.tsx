'use client'

import { Film, Check, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import type { ThumbnailOption } from './types'
import styles from '../VideoUpload.module.css'

interface ThumbnailSelectorProps {
  thumbnailOptions: ThumbnailOption[]
  selectedThumbnailIndex: number
  thumbnailLoadErrors: Set<number>
  onSelectIndex: (index: number) => void
  onLoadError: (index: number) => void
  onConfirm: () => void
  onSkip: () => void
}

export function ThumbnailSelector({
  thumbnailOptions,
  selectedThumbnailIndex,
  thumbnailLoadErrors,
  onSelectIndex,
  onLoadError,
  onConfirm,
  onSkip,
}: ThumbnailSelectorProps) {
  return (
    <div className={styles.thumbnailSelectState}>
      <div className={styles.thumbnailHeader}>
        <ImageIcon size={20} />
        <span>썸네일 선택</span>
      </div>
      <p className={styles.thumbnailHint}>
        영상에서 사용할 대표 이미지를 선택하세요
      </p>

      <div className={styles.thumbnailGrid}>
        {thumbnailOptions.map((option, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelectIndex(index)}
            className={`${styles.thumbnailItem} ${selectedThumbnailIndex === index ? styles.thumbnailSelected : ''}`}
          >
            {thumbnailLoadErrors.has(index) ? (
              <div className={styles.thumbnailPlaceholder}>
                <Film size={24} />
                <span>{option.time}</span>
              </div>
            ) : (
              <Image
                src={option.url}
                alt={`썸네일 ${option.time}`}
                width={160}
                height={90}
                className={styles.thumbnailImage}
                onError={() => onLoadError(index)}
                unoptimized
              />
            )}
            {selectedThumbnailIndex === index && (
              <div className={styles.thumbnailCheck}>
                <Check size={16} />
              </div>
            )}
            <span className={styles.thumbnailTime}>{option.time}</span>
          </button>
        ))}
      </div>

      <div className={styles.thumbnailActions}>
        <button
          type="button"
          onClick={onSkip}
          className={styles.resetBtn}
        >
          기본 썸네일 사용
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={styles.selectBtn}
        >
          <Check size={16} />
          선택 완료
        </button>
      </div>
    </div>
  )
}
