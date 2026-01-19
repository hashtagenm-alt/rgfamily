'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Play, ChevronLeft, ChevronRight, Calendar, User, Film } from 'lucide-react'
import Image from 'next/image'
import type { SignatureData } from './SigGallery'
import { formatShortDate } from '@/lib/utils/format'
import styles from './SigDetailModal.module.css'

interface SigDetailModalProps {
  signature: SignatureData
  onClose: () => void
}

// YouTube URL을 embed URL로 변환
function getEmbedUrl(url: string): string {
  if (!url) return ''

  // YouTube URL 패턴들
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  const match = url.match(youtubeRegex)

  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`
  }

  const vParam = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
  if (vParam) {
    return `https://www.youtube.com/embed/${vParam[1]}`
  }

  // Vimeo
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/
  const vimeoMatch = url.match(vimeoRegex)

  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  // SOOP VOD
  const soopVodRegex = /vod\.sooplive\.co\.kr\/(?:player\/)?(\d+)/
  const soopMatch = url.match(soopVodRegex)

  if (soopMatch && !url.includes('/embed')) {
    return `https://vod.sooplive.co.kr/player/${soopMatch[1]}/embed`
  }

  return url
}

function getEmbedUrlWithParams(url: string): string {
  const embedUrl = getEmbedUrl(url)

  if (embedUrl.includes('youtube.com/embed/')) {
    return `${embedUrl}?autoplay=1&modestbranding=1&rel=0`
  }

  if (embedUrl.includes('player.vimeo.com/')) {
    return `${embedUrl}?autoplay=1`
  }

  if (embedUrl.includes('vod.sooplive.co.kr/')) {
    return `${embedUrl}?autoPlay=true`
  }

  return embedUrl
}

export default function SigDetailModal({ signature, onClose }: SigDetailModalProps) {
  const [selectedVideoIdx, setSelectedVideoIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const hasVideos = signature.videos && signature.videos.length > 0
  const currentVideo = hasVideos ? signature.videos[selectedVideoIdx] : null

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Reset playing state when video changes
  useEffect(() => {
    setIsPlaying(false)
  }, [selectedVideoIdx])

  // Scroll tabs
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            시그니처 {signature.sigNumber}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Signature Image */}
          <div className={styles.imageSection}>
            <div className={styles.imageWrapper}>
              {signature.thumbnailUrl ? (
                <Image
                  src={signature.thumbnailUrl}
                  alt={`시그니처 ${signature.sigNumber}`}
                  fill
                  className={styles.signatureImage}
                  unoptimized
                />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <span>{signature.sigNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Video Section */}
          <div className={styles.videoSection}>
            {hasVideos ? (
              <>
                {/* Member Tabs */}
                <div className={styles.tabsContainer}>
                  <span className={styles.tabsLabel}>
                    <Film size={14} />
                    영상 ({signature.videos.length})
                  </span>

                  {signature.videos.length > 3 && (
                    <button
                      className={styles.tabsArrow}
                      onClick={() => scrollTabs('left')}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}

                  <div className={styles.tabs} ref={tabsRef}>
                    {signature.videos.map((video, idx) => (
                      <button
                        key={video.id}
                        className={`${styles.tab} ${idx === selectedVideoIdx ? styles.active : ''}`}
                        onClick={() => setSelectedVideoIdx(idx)}
                      >
                        <div className={styles.tabAvatar}>
                          {video.memberImage ? (
                            <Image
                              src={video.memberImage}
                              alt={video.memberName}
                              width={28}
                              height={28}
                              className={styles.tabAvatarImage}
                              unoptimized
                            />
                          ) : (
                            <User size={14} />
                          )}
                        </div>
                        <span className={styles.tabName}>{video.memberName}</span>
                      </button>
                    ))}
                  </div>

                  {signature.videos.length > 3 && (
                    <button
                      className={styles.tabsArrow}
                      onClick={() => scrollTabs('right')}
                    >
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>

                {/* Video Player */}
                <div className={styles.playerWrapper}>
                  {isPlaying && currentVideo ? (
                    <iframe
                      src={getEmbedUrlWithParams(currentVideo.videoUrl)}
                      className={styles.video}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className={styles.videoThumbnail} onClick={() => setIsPlaying(true)}>
                      <div className={styles.videoInfo}>
                        <User size={16} />
                        <span>{currentVideo?.memberName}</span>
                        {currentVideo && (
                          <span className={styles.videoDate}>
                            <Calendar size={12} />
                            {formatShortDate(currentVideo.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className={styles.playOverlay}>
                        <div className={styles.playButton}>
                          <Play size={32} fill="white" />
                        </div>
                        <span className={styles.playText}>영상 재생</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <Film size={32} />
                <p>등록된 영상이 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
