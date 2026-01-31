'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Radio, ChevronRight } from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import { formatDate } from '@/lib/utils/format'
import styles from './BroadcastNotice.module.css'

interface Notice {
  id: number
  title: string
  content: string | null
  category: string | null
  thumbnail_url: string | null
  created_at: string
}

export default function BroadcastNotice() {
  const supabase = useSupabaseContext()
  const [notices, setNotices] = useState<Notice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const { data, error } = await supabase
          .from('notices')
          .select('id, title, content, category, thumbnail_url, created_at')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(2)

        if (error) throw error
        setNotices(data || [])
      } catch (error) {
        console.error('공지사항 로드 실패:', error)
        setNotices([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotices()
  }, [supabase])

  // HTML 태그를 제거하고 텍스트만 추출
  const stripHtml = (html: string | null): string => {
    if (!html) return ''
    return html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<\/div>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // 카테고리 레이블
  const getCategoryLabel = (category: string | null) => {
    switch (category) {
      case 'official': return '공식'
      case 'excel': return '엑셀부'
      case 'crew': return '크루부'
      default: return '공지'
    }
  }

  if (isLoading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h3>
            <span className={styles.liveIcon}>
              <Radio size={16} />
            </span>
            공지사항
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
            공지사항
          </h3>
          <div className={styles.line} />
        </div>
        <div className={styles.empty}>등록된 공지사항이 없습니다</div>
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
          공지사항
        </h3>
        <div className={styles.line} />
        <Link href="/notice" className={styles.viewAll}>
          전체보기 <ChevronRight size={16} />
        </Link>
      </div>

      <div className={styles.list}>
        {notices.map((notice) => (
          <Link
            key={notice.id}
            href={`/notice/${notice.id}`}
            className={styles.item}
          >
            {/* Content - Left */}
            <div className={styles.itemContent}>
              <div className={styles.tagRow}>
                <span className={styles.category}>{getCategoryLabel(notice.category)}</span>
                <span className={styles.date}>{formatDate(notice.created_at)}</span>
              </div>
              <h4 className={styles.title}>{notice.title}</h4>
              <p className={styles.content}>
                {stripHtml(notice.content)}
              </p>
            </div>
            {/* Thumbnail - Right */}
            <div className={styles.itemThumbnail}>
              <Image
                src={notice.thumbnail_url || '/assets/logo/rg_logo_3d_pink.png'}
                alt={notice.title}
                fill
                sizes="(max-width: 768px) 100vw, 35vw"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
