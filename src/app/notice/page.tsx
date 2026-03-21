'use client'

import { useState, useEffect, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { InlineError } from '@/components/common/InlineError'
import { useNotices } from '@/lib/context'
import { useAuthContext } from '@/lib/context/AuthContext'
import { getSupabaseClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import {
  NoticeHero,
  NoticeFilters,
  NoticeBoard,
  NoticeMobileList,
  NoticePagination,
} from './_components'
import type { NoticeItem } from './_components'
import styles from './page.module.css'

const ITEMS_PER_PAGE = 15
const CATEGORIES = ['전체', '공지', '이벤트', '업데이트', '안내']

export default function NoticePage() {
  const noticesRepo = useNotices()
  const { isModerator } = useAuthContext()
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'title'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchNotices = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const sortedData = await noticesRepo.findPublished()

      // 공지사항별 첫 번째 이미지 첨부파일 조회
      const noticeIds = sortedData.map(n => n.id)
      const supabase = getSupabaseClient()
      const { data: attachments } = await supabase
        .from('notice_attachments')
        .select('notice_id, file_url, file_type')
        .in('notice_id', noticeIds)
        .eq('file_type', 'image')
        .order('display_order', { ascending: true })

      // notice_id별 첫 번째 이미지만 맵으로 저장
      const thumbnailMap = new Map<number, string>()
      attachments?.forEach(att => {
        if (!thumbnailMap.has(att.notice_id)) {
          thumbnailMap.set(att.notice_id, att.file_url)
        }
      })

      setNotices(
        sortedData.map((n) => ({
          id: n.id,
          title: n.title,
          isPinned: n.is_pinned,
          isImportant: false,
          createdAt: n.created_at,
          author: (n as { author_nickname?: string }).author_nickname || '운영자',
          viewCount: n.view_count || 0,
          category: n.category || '공지',
          thumbnailUrl: thumbnailMap.get(n.id) || null,
          displayOrder: n.display_order,
        }))
      )
    } catch (err) {
      logger.error('공지사항 로드 실패:', err)
      setError('공지사항을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }, [noticesRepo])

  useEffect(() => {
    fetchNotices()
  }, [fetchNotices])

  // 드래그앤드롭 순서 변경 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = notices.findIndex((item) => item.id === active.id)
    const newIndex = notices.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // UI 먼저 업데이트
    const reorderedNotices = arrayMove(notices, oldIndex, newIndex)
    setNotices(reorderedNotices)

    // DB에 저장
    setIsReordering(true)
    try {
      const supabase = getSupabaseClient()
      const updates = reorderedNotices.map((item, index) => ({
        id: item.id,
        display_order: index + 1,
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('notices')
          .update({ display_order: update.display_order })
          .eq('id', update.id)

        if (error) throw error
      }
    } catch (err) {
      logger.error('순서 저장 실패:', err)
      fetchNotices()
    } finally {
      setIsReordering(false)
    }
  }

  // 검색 및 필터링
  const filteredNotices = notices.filter(notice => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (searchType === 'title') {
        if (!notice.title.toLowerCase().includes(query)) return false
      } else {
        if (!notice.title.toLowerCase().includes(query)) return false
      }
    }
    if (filterCategory !== 'all' && filterCategory !== '전체') {
      if (notice.category !== filterCategory) return false
    }
    return true
  })

  // 고정글과 일반글 분리
  const pinnedNotices = filteredNotices.filter(n => n.isPinned)
  const allNormalNotices = filteredNotices.filter(n => !n.isPinned)

  // 페이지네이션 계산
  const totalPages = Math.ceil(allNormalNotices.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const normalNotices = allNormalNotices.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // 필터/검색 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterCategory])

  return (
    <div className={styles.main}>
      <Navbar />
      <NoticeHero />

      <div className={styles.container}>
        <NoticeFilters
          totalCount={filteredNotices.length}
          categories={CATEGORIES}
          filterCategory={filterCategory}
          onFilterCategory={setFilterCategory}
          searchType={searchType}
          onSearchType={setSearchType}
          searchQuery={searchQuery}
          onSearchQuery={setSearchQuery}
          onSearch={fetchNotices}
          showWriteButton={isModerator()}
        />

        {error ? (
          <InlineError message={error} onRetry={fetchNotices} />
        ) : isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>공지사항을 불러오는 중...</span>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className={styles.empty}>
            <p>등록된 공지사항이 없습니다</p>
          </div>
        ) : (
          <>
            <NoticeBoard
              notices={filteredNotices}
              isReordering={isReordering}
              showDragHandle={isModerator()}
              fetchNotices={fetchNotices}
              onDragEnd={handleDragEnd}
            />

            <NoticeMobileList
              pinnedNotices={pinnedNotices}
              normalNotices={normalNotices}
            />

            <NoticePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
