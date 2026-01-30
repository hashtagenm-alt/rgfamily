'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, ChevronLeft, ChevronRight, Calendar, User, Film, Volume2, ExternalLink, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import type { SignatureData } from './SigGallery'
import { formatShortDate } from '@/lib/utils/format'
import styles from './SigDetailModal.module.css'

interface SigDetailModalProps {
  signature: SignatureData
  onClose: () => void
}

// Cloudflare Stream UID를 embed URL로 변환
function getCloudflareEmbedUrl(cloudflareUid: string): string {
  return `https://iframe.videodelivery.net/${cloudflareUid}`
}

// YouTube URL을 embed URL로 변환
function getEmbedUrl(url: string, cloudflareUid?: string | null): string {
  // Cloudflare Stream UID가 있으면 우선 사용
  if (cloudflareUid) {
    return getCloudflareEmbedUrl(cloudflareUid)
  }

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

function getEmbedUrlWithParams(url: string, cloudflareUid?: string | null): string {
  const embedUrl = getEmbedUrl(url, cloudflareUid)

  // Cloudflare Stream
  if (embedUrl.includes('videodelivery.net/')) {
    return `${embedUrl}?autoplay=true&muted=false`
  }

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

// 직접 비디오 URL인지 확인 (MP4, WebM 등)
function isDirectVideoUrl(url: string): boolean {
  if (!url) return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov']
  const lowerUrl = url.toLowerCase()
  return videoExtensions.some(ext => lowerUrl.includes(ext)) ||
    url.includes('supabase.co/storage')
}

// Supabase Storage URL을 프록시 URL로 변환 (Chrome URL 안전 검사 우회)
function getProxiedVideoUrl(url: string): string {
  if (!url) return ''
  // Supabase Storage URL이면 API Route 프록시 사용 (프로덕션 호환)
  if (url.includes('supabase.co/storage')) {
    return `/api/video-proxy?url=${encodeURIComponent(url)}`
  }
  return url
}

// YouTube 썸네일 URL 추출
function getYoutubeThumbnail(url: string): string | null {
  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  const match = url.match(youtubeRegex)
  if (match) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  }
  const vParam = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
  if (vParam) {
    return `https://img.youtube.com/vi/${vParam[1]}/hqdefault.jpg`
  }
  return null
}

export default function SigDetailModal({ signature, onClose }: SigDetailModalProps) {
  const [selectedVideoIdx, setSelectedVideoIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const hasVideos = signature.videos && signature.videos.length > 0
  const currentVideo = hasVideos ? signature.videos[selectedVideoIdx] : null
  const totalVideos = signature.videos?.length || 0

  // Keyboard navigation (Escape, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && hasVideos && selectedVideoIdx > 0) {
        setSelectedVideoIdx(prev => prev - 1)
      } else if (e.key === 'ArrowRight' && hasVideos && selectedVideoIdx < totalVideos - 1) {
        setSelectedVideoIdx(prev => prev + 1)
      } else if (e.key === ' ' && hasVideos && !isPlaying) {
        e.preventDefault()
        setIsPlaying(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, hasVideos, selectedVideoIdx, totalVideos, isPlaying])

  // Reset playing state and error when video changes
  useEffect(() => {
    setIsPlaying(false)
    setVideoError(false)
  }, [selectedVideoIdx])

  // Scroll tabs to show active tab
  useEffect(() => {
    if (tabsRef.current && hasVideos) {
      const activeTab = tabsRef.current.children[selectedVideoIdx] as HTMLElement
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [selectedVideoIdx, hasVideos])

  // Navigate to previous/next video
  const goToPrevVideo = useCallback(() => {
    if (selectedVideoIdx > 0) {
      setSelectedVideoIdx(prev => prev - 1)
    }
  }, [selectedVideoIdx])

  const goToNextVideo = useCallback(() => {
    if (selectedVideoIdx < totalVideos - 1) {
      setSelectedVideoIdx(prev => prev + 1)
    }
  }, [selectedVideoIdx, totalVideos])

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

  // Get video thumbnail (YouTube or signature thumbnail)
  const getVideoThumbnail = (videoUrl: string): string | null => {
    const ytThumb = getYoutubeThumbnail(videoUrl)
    if (ytThumb) return ytThumb
    return signature.thumbnailUrl || null
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
          <div className={styles.headerInfo}>
            <h2 className={styles.title}>
              시그니처 {signature.sigNumber}
            </h2>
            {signature.title && (
              <span className={styles.subtitle}>{signature.title}</span>
            )}
          </div>
          <div className={styles.headerActions}>
            {currentVideo && (
              <a
                href={currentVideo.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalLink}
                title="새 탭에서 열기"
              >
                <ExternalLink size={18} />
              </a>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
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
                />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <span>{signature.sigNumber}</span>
                </div>
              )}
            </div>
            {/* Signature Title below image */}
            {signature.title && (
              <div className={styles.sigTitle}>
                <span className={styles.sigNumber}>#{signature.sigNumber}</span>
                <span className={styles.sigName}>{signature.title}</span>
              </div>
            )}
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

                {/* Video Player with Navigation */}
                <div className={styles.playerContainer}>
                  {/* Left Navigation Arrow */}
                  {totalVideos > 1 && (
                    <button
                      className={`${styles.navArrow} ${styles.navLeft} ${selectedVideoIdx === 0 ? styles.disabled : ''}`}
                      onClick={goToPrevVideo}
                      disabled={selectedVideoIdx === 0}
                      title="이전 영상 (←)"
                    >
                      <ChevronLeft size={24} />
                    </button>
                  )}

                  <div className={styles.playerWrapper}>
                    <AnimatePresence mode="wait">
                      {videoError && currentVideo ? (
                        <motion.div
                          key={`error-${selectedVideoIdx}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={styles.videoError}
                        >
                          <AlertCircle size={48} />
                          <p>영상을 불러올 수 없습니다</p>
                          <a
                            href={currentVideo.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.videoErrorLink}
                          >
                            <ExternalLink size={16} />
                            원본 링크로 이동
                          </a>
                        </motion.div>
                      ) : isPlaying && currentVideo ? (
                        <motion.div
                          key={`playing-${selectedVideoIdx}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={styles.videoWrapper}
                        >
                          {isDirectVideoUrl(currentVideo.videoUrl) ? (
                            <video
                              src={getProxiedVideoUrl(currentVideo.videoUrl)}
                              className={styles.video}
                              controls
                              autoPlay
                              playsInline
                              preload="auto"
                              onError={() => setVideoError(true)}
                            />
                          ) : (
                            <iframe
                              src={getEmbedUrlWithParams(currentVideo.videoUrl, currentVideo.cloudflareUid)}
                              className={styles.video}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              onError={() => setVideoError(true)}
                            />
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`thumbnail-${selectedVideoIdx}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={styles.videoThumbnail}
                          onClick={() => setIsPlaying(true)}
                        >
                          {/* YouTube thumbnail background */}
                          {currentVideo && getVideoThumbnail(currentVideo.videoUrl) && (
                            <div className={styles.thumbnailBg}>
                              <Image
                                src={getVideoThumbnail(currentVideo.videoUrl)!}
                                alt="Video thumbnail"
                                fill
                                className={styles.thumbnailImage}
                              />
                              <div className={styles.thumbnailOverlay} />
                            </div>
                          )}

                          {/* Member info */}
                          <div className={styles.videoInfo}>
                            {currentVideo?.memberImage && (
                              <div className={styles.videoInfoAvatar}>
                                <Image
                                  src={currentVideo.memberImage}
                                  alt={currentVideo.memberName}
                                  width={32}
                                  height={32}
                                />
                              </div>
                            )}
                            <div className={styles.videoInfoText}>
                              <span className={styles.videoInfoName}>{currentVideo?.memberName}</span>
                              {currentVideo && (
                                <span className={styles.videoDate}>
                                  <Calendar size={12} />
                                  {formatShortDate(currentVideo.createdAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Play button */}
                          <div className={styles.playOverlay}>
                            <div className={styles.playButton}>
                              <Play size={40} fill="white" />
                            </div>
                            <span className={styles.playText}>
                              <Volume2 size={14} />
                              재생하려면 클릭하세요
                            </span>
                          </div>

                          {/* Video index indicator */}
                          {totalVideos > 1 && (
                            <div className={styles.videoIndex}>
                              {selectedVideoIdx + 1} / {totalVideos}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right Navigation Arrow */}
                  {totalVideos > 1 && (
                    <button
                      className={`${styles.navArrow} ${styles.navRight} ${selectedVideoIdx === totalVideos - 1 ? styles.disabled : ''}`}
                      onClick={goToNextVideo}
                      disabled={selectedVideoIdx === totalVideos - 1}
                      title="다음 영상 (→)"
                    >
                      <ChevronRight size={24} />
                    </button>
                  )}
                </div>

                {/* Keyboard hint */}
                <div className={styles.keyboardHint}>
                  <span>← → 키로 영상 전환</span>
                  <span>스페이스바로 재생</span>
                  <span>ESC로 닫기</span>
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
