"use client"

import { useState } from "react"

interface VimeoPlayerProps {
  vimeoId: string
  className?: string
  autoplay?: boolean
}

/**
 * Vimeo 임베드 플레이어
 * - 16:9 반응형 비율 유지
 * - 로딩 중 스켈레톤 표시
 * - title, byline, portrait UI 숨김
 */
export default function VimeoPlayer({
  vimeoId,
  className,
  autoplay = false,
}: VimeoPlayerProps) {
  const [loaded, setLoaded] = useState(false)

  const src =
    `https://player.vimeo.com/video/${vimeoId}` +
    `?autoplay=${autoplay ? 1 : 0}&title=0&byline=0&portrait=0`

  return (
    <div className={`relative w-full ${className ?? ""}`} style={{ aspectRatio: "16/9" }}>
      {/* 로딩 스켈레톤 */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse rounded-lg bg-neutral-800" />
      )}

      <iframe
        src={src}
        className="absolute inset-0 h-full w-full rounded-lg"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        onLoad={() => setLoaded(true)}
        style={{ border: "none" }}
        title="Vimeo video player"
      />
    </div>
  )
}
