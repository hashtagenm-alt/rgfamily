"use client"

import { useEffect, useRef } from "react"
import Hls from "hls.js"
import { getStreamHlsUrl } from "@/lib/cloudflare"

interface HlsPlayerProps {
  cloudflareUid: string
  className?: string
  autoPlay?: boolean
  controls?: boolean
  loop?: boolean
  muted?: boolean
  playsInline?: boolean
  poster?: string
  /** 1080p 고화질 강제 (기본값: true) */
  forceHighQuality?: boolean
}

/**
 * Cloudflare Stream HLS 플레이어
 * - Safari: 네이티브 HLS 지원
 * - 기타 브라우저: hls.js 사용
 * - clientBandwidthHint로 1080p 고화질 강제
 */
export default function HlsPlayer({
  cloudflareUid,
  className,
  autoPlay = false,
  controls = true,
  loop = false,
  muted = false,
  playsInline = true,
  poster,
  forceHighQuality = true,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !cloudflareUid) return

    // HLS URL 생성 (고화질 강제 시 clientBandwidthHint=10)
    const hlsUrl = getStreamHlsUrl(cloudflareUid, {
      clientBandwidthHint: forceHighQuality ? 10 : undefined,
    })

    // Safari는 네이티브 HLS 지원
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl
      return
    }

    // 다른 브라우저는 hls.js 사용
    if (Hls.isSupported()) {
      const hls = new Hls({
        // 고화질 우선 설정
        startLevel: -1, // 자동 선택
        capLevelToPlayerSize: false, // 플레이어 크기 제한 없음
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      })

      hls.loadSource(hlsUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video.play().catch(() => {
            // 자동재생 차단 시 무시
          })
        }
      })

      hlsRef.current = hls
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [cloudflareUid, forceHighQuality, autoPlay])

  return (
    <video
      ref={videoRef}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      poster={poster}
    />
  )
}
