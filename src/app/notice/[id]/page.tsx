'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowLeft, Pin, Calendar, Eye, Tag, ChevronLeft, ChevronRight, Share2, Edit2, Trash2 } from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import { useAuthContext } from '@/lib/context/AuthContext'
import { deleteNotice } from '@/lib/actions/notices'
import { formatDate } from '@/lib/utils/format'
import styles from './page.module.css'

interface Attachment {
  id: number
  file_url: string
  file_name: string
  file_type: 'image' | 'video'
  file_size: number | null
  display_order: number
}

interface NoticeDetail {
  id: number
  title: string
  content: string
  category: string
  thumbnailUrl: string | null
  isPinned: boolean
  viewCount: number
  createdAt: string
  attachments: Attachment[]
}

interface NavNotice {
  id: number
  title: string
}

const CATEGORY_LABELS: Record<string, string> = {
  official: '공식',
  excel: '엑셀부',
  crew: '크루부',
  event: '이벤트',
}

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = useSupabaseContext()
  const { isAdmin } = useAuthContext()
  const [notice, setNotice] = useState<NoticeDetail | null>(null)
  const [prevNotice, setPrevNotice] = useState<NavNotice | null>(null)
  const [nextNotice, setNextNotice] = useState<NavNotice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fetchNotice = useCallback(async () => {
    setIsLoading(true)
    const currentId = parseInt(id)

    // 현재 공지사항 조회
    const { data, error } = await supabase
      .from('notices')
      .select('id, title, content, category, thumbnail_url, is_pinned, view_count, created_at')
      .eq('id', currentId)
      .single()

    if (error) {
      console.error('공지사항 로드 실패:', error)
    } else if (data) {
      // 첨부파일 조회
      const { data: attachmentsData } = await supabase
        .from('notice_attachments')
        .select('*')
        .eq('notice_id', currentId)
        .order('display_order', { ascending: true })

      setNotice({
        id: data.id,
        title: data.title,
        content: data.content || '',
        category: data.category || 'official',
        thumbnailUrl: data.thumbnail_url,
        isPinned: data.is_pinned,
        viewCount: data.view_count || 0,
        createdAt: data.created_at,
        attachments: (attachmentsData as Attachment[]) || [],
      })

      // 이전 글 조회 (현재 id보다 작은 것 중 가장 큰 id)
      const { data: prevData } = await supabase
        .from('notices')
        .select('id, title')
        .lt('id', currentId)
        .order('id', { ascending: false })
        .limit(1)
        .single()

      setPrevNotice(prevData ? { id: prevData.id, title: prevData.title } : null)

      // 다음 글 조회 (현재 id보다 큰 것 중 가장 작은 id)
      const { data: nextData } = await supabase
        .from('notices')
        .select('id, title')
        .gt('id', currentId)
        .order('id', { ascending: true })
        .limit(1)
        .single()

      setNextNotice(nextData ? { id: nextData.id, title: nextData.title } : null)

      // 조회수 증가 (백그라운드 처리)
      supabase
        .from('notices')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', currentId)
        .then(() => {})
    }

    setIsLoading(false)
  }, [supabase, id])

  useEffect(() => {
    fetchNotice()
  }, [fetchNotice])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: notice?.title,
          url: window.location.href,
        })
      } catch {
        // 사용자가 공유 취소
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('링크가 복사되었습니다.')
    }
  }

  const handleDelete = async () => {
    if (!notice) return

    setIsDeleting(true)
    try {
      const result = await deleteNotice(notice.id)
      if (result.error) {
        alert(`삭제 실패: ${result.error}`)
      } else {
        router.push('/notice')
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (isLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>공지사항을 불러오는 중...</span>
        </div>
      </main>
    )
  }

  if (!notice) {
    return (
      <main className={styles.main}>
        <div className={styles.empty}>
          <p>공지사항을 찾을 수 없습니다</p>
          <Link href="/notice" className={styles.backLink}>
            목록으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      {/* Hero Section with Thumbnail */}
      <div className={styles.hero}>
        {notice.thumbnailUrl && (
          <div className={styles.heroImage}>
            <Image
              src={notice.thumbnailUrl}
              alt={notice.title}
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
            <div className={styles.heroOverlay} />
          </div>
        )}

        <div className={styles.heroContent}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Navigation */}
            <button onClick={() => router.back()} className={styles.backButton}>
              <ArrowLeft size={18} />
              <span>목록</span>
            </button>

            {/* Badges */}
            <div className={styles.badges}>
              {notice.isPinned && (
                <span className={styles.pinnedBadge}>
                  <Pin size={12} />
                  중요
                </span>
              )}
              <span className={styles.categoryBadge} data-category={notice.category}>
                <Tag size={12} />
                {CATEGORY_LABELS[notice.category] || notice.category}
              </span>
            </div>

            {/* Title */}
            <h1 className={styles.heroTitle}>{notice.title}</h1>

            {/* Meta */}
            <div className={styles.heroMeta}>
              <span className={styles.metaItem}>
                <Calendar size={14} />
                {formatDate(notice.createdAt)}
              </span>
              <span className={styles.metaItem}>
                <Eye size={14} />
                조회 {notice.viewCount.toLocaleString()}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className={styles.container}>
        {/* Article */}
        <motion.article
          className={styles.article}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* HTML 콘텐츠 렌더링 */}
          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: notice.content }}
          />

          {/* 첨부파일 */}
          {notice.attachments && notice.attachments.length > 0 && (
            <div className={styles.attachments}>
              <h3 className={styles.attachmentsTitle}>첨부파일</h3>
              <div className={styles.attachmentGrid}>
                {notice.attachments.map((attachment) => (
                  <div key={attachment.id} className={styles.attachmentItem}>
                    {attachment.file_type === 'image' ? (
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.attachmentLink}
                      >
                        <Image
                          src={attachment.file_url}
                          alt={attachment.file_name}
                          width={400}
                          height={300}
                          className={styles.attachmentImage}
                          style={{ objectFit: 'cover' }}
                        />
                      </a>
                    ) : (
                      <video
                        src={attachment.file_url}
                        controls
                        className={styles.attachmentVideo}
                        preload="metadata"
                      />
                    )}
                    <span className={styles.attachmentName}>{attachment.file_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            {/* Admin Actions */}
            {isAdmin() && (
              <div className={styles.adminActions}>
                <Link href={`/notice/write?id=${id}`} className={styles.editBtn}>
                  <Edit2 size={16} />
                  수정
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={styles.deleteBtn}
                  disabled={isDeleting}
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              </div>
            )}
            <button onClick={handleShare} className={styles.shareBtn}>
              <Share2 size={16} />
              공유하기
            </button>
          </div>
        </motion.article>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>공지사항 삭제</h3>
              <p className={styles.modalMessage}>
                이 공지사항을 정말 삭제하시겠습니까?<br />
                삭제된 공지사항은 복구할 수 없습니다.
              </p>
              <div className={styles.modalActions}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={styles.modalCancelBtn}
                  disabled={isDeleting}
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  className={styles.modalDeleteBtn}
                  disabled={isDeleting}
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className={styles.navigation}>
          {prevNotice ? (
            <Link href={`/notice/${prevNotice.id}`} className={styles.navItem}>
              <ChevronLeft size={16} />
              <div className={styles.navContent}>
                <span className={styles.navLabel}>이전 글</span>
                <span className={styles.navTitle}>{prevNotice.title}</span>
              </div>
            </Link>
          ) : (
            <div className={styles.navPlaceholder} />
          )}

          <Link href="/notice" className={styles.listBtn}>
            목록
          </Link>

          {nextNotice ? (
            <Link href={`/notice/${nextNotice.id}`} className={`${styles.navItem} ${styles.navRight}`}>
              <div className={styles.navContent}>
                <span className={styles.navLabel}>다음 글</span>
                <span className={styles.navTitle}>{nextNotice.title}</span>
              </div>
              <ChevronRight size={16} />
            </Link>
          ) : (
            <div className={styles.navPlaceholder} />
          )}
        </div>
      </div>
    </main>
  )
}
