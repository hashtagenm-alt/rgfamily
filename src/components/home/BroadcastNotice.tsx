'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Radio, ChevronRight, ExternalLink } from 'lucide-react'
import type { PandaNotice } from '@/app/api/panda-notice/route'
import styles from './BroadcastNotice.module.css'

export default function BroadcastNotice() {
  const [notices, setNotices] = useState<PandaNotice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch('/api/panda-notice')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setNotices(data.notices || [])
      } catch (error) {
        console.error('방송 공지 로드 실패:', error)
        setNotices([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotices()
  }, [])

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const parseContent = (content: string) => {
    // HTML 태그를 줄바꿈으로 변환 (br, p, div 등)
    let text = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '') // 나머지 태그 제거
      .replace(/&nbsp;/g, ' ')
      .replace(/\n\s*\n/g, '\n') // 연속 줄바꿈 정리
      .trim()
    return text
  }

  const handleClick = (notice: PandaNotice) => {
    window.open(
      `https://www.pandalive.co.kr/channel/rgfamily/notice`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  if (isLoading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h3>
            <span className={styles.liveIcon}>
              <Radio size={16} />
            </span>
            방송 공지
          </h3>
          <div className={styles.line} />
        </div>
        <div className={styles.loading}>로딩 중...</div>
      </section>
    )
  }

  if (notices.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h3>
            <span className={styles.liveIcon}>
              <Radio size={16} />
            </span>
            방송 공지
          </h3>
          <div className={styles.line} />
        </div>
        <div className={styles.empty}>등록된 방송 공지가 없습니다</div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3>
          <span className={styles.liveIcon}>
            <Radio size={16} />
          </span>
          방송 공지
        </h3>
        <div className={styles.line} />
        <a
          href="https://www.pandalive.co.kr/channel/rgfamily/notice"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.viewAll}
        >
          전체보기 <ChevronRight size={16} />
        </a>
      </div>

      <div className={styles.list}>
        {notices.map((notice) => (
          <div
            key={notice.idx}
            className={styles.item}
            onClick={() => handleClick(notice)}
          >
            {/* Content - Right */}
            <div className={styles.itemContent}>
              <div className={styles.tagRow}>
                <span className={styles.date}>{formatDateTime(notice.insertDateTime)}</span>
              </div>
              <p className={styles.content}>
                {parseContent(notice.contents)}
              </p>
              <span className={styles.more}>
                PandaLive에서 보기 <ExternalLink size={12} />
              </span>
            </div>
            {/* Thumbnail - Right */}
            <div className={styles.itemThumbnail}>
              <Image
                src={notice.imgMainSrc || '/assets/logo/rg_logo_3d_pink.png'}
                alt="방송 공지 이미지"
                fill
                sizes="(max-width: 768px) 100vw, 35vw"
                style={{ objectFit: 'contain', objectPosition: 'center' }}
                unoptimized
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
