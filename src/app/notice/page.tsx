'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Pin, Search, Eye, ChevronDown, Bell, PenSquare, ImageIcon, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AdminNoticeActions from '@/components/notice/AdminNoticeActions'
import { InlineError } from '@/components/common/InlineError'
import { useNotices } from '@/lib/context'
import { useAuthContext } from '@/lib/context/AuthContext'
import { formatShortDate } from '@/lib/utils/format'
import { getSupabaseClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface NoticeItem {
  id: number
  title: string
  isPinned: boolean
  isImportant: boolean
  createdAt: string
  author: string
  viewCount: number
  category: string
  thumbnailUrl: string | null
  displayOrder: number | null
}

// 드래그 가능한 행 컴포넌트
function SortableNoticeRow({
  notice,
  index,
  showDragHandle,
  fetchNotices,
}: {
  notice: NoticeItem
  index: number
  showDragHandle: boolean
  fetchNotices: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: notice.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${notice.isPinned ? styles.pinned : ''}`}
    >
      {/* 드래그 핸들 (관리자만) */}
      {showDragHandle && (
        <div
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Number / Badge */}
      <div className={styles.cellNumber}>
        {notice.isPinned ? (
          <span className={styles.pinnedBadge}>
            <Pin size={12} />
            공지
          </span>
        ) : (
          index + 1
        )}
      </div>

      {/* Thumbnail */}
      <Link href={`/notice/${notice.id}`} className={styles.cellThumbnail}>
        {notice.thumbnailUrl ? (
          <div className={styles.thumbnailWrapper}>
            <Image
              src={notice.thumbnailUrl}
              alt=""
              fill
              sizes="40px"
              className={styles.thumbnail}
            />
          </div>
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <ImageIcon size={14} />
          </div>
        )}
      </Link>

      {/* Category */}
      <Link href={`/notice/${notice.id}`} className={styles.cellCategory}>
        <span className={`${styles.categoryBadge} ${notice.isImportant ? styles.important : ''}`}>
          {notice.category}
        </span>
      </Link>

      {/* Title */}
      <Link href={`/notice/${notice.id}`} className={styles.cellTitle}>
        <h3 className={styles.postTitle}>{notice.title}</h3>
        {isNew(notice.createdAt) && (
          <span className={styles.newBadge}>N</span>
        )}
        {notice.isImportant && (
          <span className={styles.importantBadge}>중요</span>
        )}
      </Link>

      {/* Admin Actions */}
      <AdminNoticeActions
        noticeId={notice.id}
        isPinned={notice.isPinned}
        onUpdated={fetchNotices}
      />

      {/* Author */}
      <span className={styles.cellAuthor}>{notice.author}</span>

      {/* Date */}
      <span className={styles.cellDate}>
        {formatShortDate(notice.createdAt)}
      </span>

      {/* Views */}
      <span className={styles.cellViews}>
        {notice.viewCount.toLocaleString()}
      </span>
    </div>
  )
}

function isNew(dateStr: string): boolean {
  const postDate = new Date(dateStr)
  const now = new Date()
  const diffDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 3
}

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
  const ITEMS_PER_PAGE = 15

  const categories = ['전체', '공지', '이벤트', '업데이트', '안내']

  // 드래그앤드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchNotices = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Repository 패턴 사용 (withRetry 적용됨)
      // Repository가 display_order → created_at 순으로 정렬하여 반환
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
        sortedData.map((n, index) => ({
          id: n.id,
          title: n.title,
          isPinned: n.is_pinned,
          isImportant: index < 2,
          createdAt: n.created_at,
          author: (n as { author_nickname?: string }).author_nickname || '운영자',
          viewCount: n.view_count || 0,
          category: n.category || '공지',
          thumbnailUrl: thumbnailMap.get(n.id) || null,
          displayOrder: n.display_order,
        }))
      )
    } catch (err) {
      console.error('공지사항 로드 실패:', err)
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
      console.error('순서 저장 실패:', err)
      // 실패 시 원래 순서로 복원
      fetchNotices()
    } finally {
      setIsReordering(false)
    }
  }

  // 검색 및 필터링
  const filteredNotices = notices.filter(notice => {
    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (searchType === 'title') {
        if (!notice.title.toLowerCase().includes(query)) return false
      } else {
        if (!notice.title.toLowerCase().includes(query)) return false
      }
    }
    // 카테고리 필터
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

  // 페이지 버튼 생성
  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  // 필터/검색 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterCategory])

  return (
      <div className={styles.main}>
        <Navbar />
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroIcon}>
              <Bell size={32} />
            </div>
            <h1 className={styles.title}>공지사항</h1>
            <p className={styles.subtitle}>RG FAMILY 공식 공지 및 소식</p>
          </div>
        </section>

      <div className={styles.container}>
        {/* Board Header */}
        <div className={styles.boardHeader}>
          {/* Left: Stats & Category Filter */}
          <div className={styles.boardLeft}>
            <span className={styles.totalCount}>
              전체 <strong>{filteredNotices.length}</strong>건
            </span>
            <div className={styles.categoryTabs}>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`${styles.categoryTab} ${(filterCategory === cat || (filterCategory === 'all' && cat === '전체')) ? styles.active : ''}`}
                  onClick={() => setFilterCategory(cat === '전체' ? 'all' : cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Search + Admin Write Button */}
          <div className={styles.headerRight}>
            <div className={styles.searchArea}>
              <div className={styles.searchTypeSelect}>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'all' | 'title')}
                  className={styles.select}
                >
                  <option value="all">전체</option>
                  <option value="title">제목</option>
                </select>
                <ChevronDown size={14} className={styles.selectIcon} />
              </div>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="검색어 입력"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchNotices()}
                />
                <button className={styles.searchBtn}>
                  <Search size={16} />
                </button>
              </div>
            </div>

            {/* 운영진 글쓰기 버튼 (moderator 이상) */}
            {isModerator() && (
              <Link href="/notice/write" className={styles.writeBtn}>
                <PenSquare size={16} />
                <span>글쓰기</span>
              </Link>
            )}
          </div>
        </div>

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
            {/* Board Table */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className={`${styles.board} ${isReordering ? styles.reordering : ''}`}>
                {/* Table Header */}
                <div className={styles.tableHeader}>
                  {isModerator() && <span className={styles.colDrag}></span>}
                  <span className={styles.colNumber}>번호</span>
                  <span className={styles.colThumbnail}></span>
                  <span className={styles.colCategory}>분류</span>
                  <span className={styles.colTitle}>제목</span>
                  <span className={styles.colAuthor}>작성자</span>
                  <span className={styles.colDate}>작성일</span>
                  <span className={styles.colViews}>조회</span>
                </div>

                <SortableContext
                  items={filteredNotices.map(n => n.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={styles.tableBody}>
                    {filteredNotices.map((notice, index) => (
                      <SortableNoticeRow
                        key={notice.id}
                        notice={notice}
                        index={index}
                        showDragHandle={isModerator()}
                        fetchNotices={fetchNotices}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </DndContext>

            {/* Mobile List */}
            <div className={styles.mobileList}>
              {/* Pinned */}
              {pinnedNotices.map((notice) => (
                <Link
                  key={notice.id}
                  href={`/notice/${notice.id}`}
                  className={`${styles.mobileCard} ${styles.mobilePinned}`}
                >
                  <div className={styles.mobileCardContent}>
                    {notice.thumbnailUrl && (
                      <div className={styles.mobileThumbnail}>
                        <Image
                          src={notice.thumbnailUrl}
                          alt=""
                          fill
                          sizes="60px"
                          className={styles.thumbnail}
                        />
                      </div>
                    )}
                    <div className={styles.mobileCardInfo}>
                      <div className={styles.mobileHeader}>
                        <span className={styles.mobilePinnedBadge}>
                          <Pin size={10} /> 공지
                        </span>
                        <span className={styles.mobileCategoryBadge}>{notice.category}</span>
                        {isNew(notice.createdAt) && <span className={styles.newBadge}>N</span>}
                        {notice.isImportant && <span className={styles.importantBadge}>중요</span>}
                      </div>
                      <h3 className={styles.mobileTitle}>{notice.title}</h3>
                      <div className={styles.mobileMeta}>
                        <span>{notice.author}</span>
                        <span className={styles.mobileDivider}>·</span>
                        <span>{formatShortDate(notice.createdAt)}</span>
                        <span className={styles.mobileDivider}>·</span>
                        <span className={styles.mobileViews}>
                          <Eye size={12} /> {notice.viewCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {/* Normal */}
              {normalNotices.map((notice) => (
                <Link
                  key={notice.id}
                  href={`/notice/${notice.id}`}
                  className={styles.mobileCard}
                >
                  <div className={styles.mobileCardContent}>
                    {notice.thumbnailUrl && (
                      <div className={styles.mobileThumbnail}>
                        <Image
                          src={notice.thumbnailUrl}
                          alt=""
                          fill
                          sizes="60px"
                          className={styles.thumbnail}
                        />
                      </div>
                    )}
                    <div className={styles.mobileCardInfo}>
                      <div className={styles.mobileHeader}>
                        <span className={styles.mobileCategoryBadge}>{notice.category}</span>
                        {isNew(notice.createdAt) && <span className={styles.newBadge}>N</span>}
                      </div>
                      <h3 className={styles.mobileTitle}>{notice.title}</h3>
                      <div className={styles.mobileMeta}>
                        <span>{notice.author}</span>
                        <span className={styles.mobileDivider}>·</span>
                        <span>{formatShortDate(notice.createdAt)}</span>
                        <span className={styles.mobileDivider}>·</span>
                        <span className={styles.mobileViews}>
                          <Eye size={12} /> {notice.viewCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  «
                </button>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                {getPageNumbers().map(pageNum => (
                  <button
                    key={pageNum}
                    className={`${styles.pageBtn} ${currentPage === pageNum ? styles.active : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  »
                </button>
              </div>
            )}
          </>
        )}
        </div>
        <Footer />
      </div>
  )
}
