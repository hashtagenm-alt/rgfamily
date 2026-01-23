'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Pin, Search, Eye, ChevronDown, Bell, PenSquare } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AdminNoticeActions from '@/components/notice/AdminNoticeActions'
import { useNotices } from '@/lib/context'
import { useAuthContext } from '@/lib/context/AuthContext'
import { formatShortDate } from '@/lib/utils/format'
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
}

function isNew(dateStr: string): boolean {
  const postDate = new Date(dateStr)
  const now = new Date()
  const diffDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 3
}

export default function NoticePage() {
  const noticesRepo = useNotices()
  const { isAdmin } = useAuthContext()
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'title'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const categories = ['전체', '공지', '이벤트', '업데이트', '안내']

  const fetchNotices = useCallback(async () => {
    setIsLoading(true)

    try {
      // Repository 패턴 사용 (withRetry 적용됨)
      const data = await noticesRepo.findPublished()

      // 고정글 우선, 최신순 정렬
      const sortedData = [...data].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setNotices(
        sortedData.map((n, index) => ({
          id: n.id,
          title: n.title,
          isPinned: n.is_pinned,
          isImportant: index < 2,
          createdAt: n.created_at,
          author: '운영자',
          viewCount: n.view_count || 0,
          category: n.category || '공지',
        }))
      )
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [noticesRepo])

  useEffect(() => {
    fetchNotices()
  }, [fetchNotices])

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
  const normalNotices = filteredNotices.filter(n => !n.isPinned)

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

            {/* Admin Write Button */}
            {isAdmin() && (
              <Link href="/notice/write" className={styles.writeBtn}>
                <PenSquare size={16} />
                <span>글쓰기</span>
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
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
            <div className={styles.board}>
              {/* Table Header */}
              <div className={styles.tableHeader}>
                <span className={styles.colNumber}>번호</span>
                <span className={styles.colCategory}>분류</span>
                <span className={styles.colTitle}>제목</span>
                <span className={styles.colAuthor}>작성자</span>
                <span className={styles.colDate}>작성일</span>
                <span className={styles.colViews}>조회</span>
              </div>

              {/* Pinned Notices */}
              {pinnedNotices.length > 0 && (
                <div className={styles.pinnedSection}>
                  {pinnedNotices.map((notice) => (
                    <Link
                      key={notice.id}
                      href={`/notice/${notice.id}`}
                      className={`${styles.row} ${styles.pinned} noticeRow`}
                    >
                      {/* Badge */}
                      <div className={styles.cellNumber}>
                        <span className={styles.pinnedBadge}>
                          <Pin size={12} />
                          공지
                        </span>
                      </div>

                      {/* Category */}
                      <div className={styles.cellCategory}>
                        <span className={`${styles.categoryBadge} ${notice.isImportant ? styles.important : ''}`}>
                          {notice.category}
                        </span>
                      </div>

                      {/* Title */}
                      <div className={styles.cellTitle}>
                        <h3 className={styles.postTitle}>{notice.title}</h3>
                        {isNew(notice.createdAt) && (
                          <span className={styles.newBadge}>N</span>
                        )}
                        {notice.isImportant && (
                          <span className={styles.importantBadge}>중요</span>
                        )}
                        {/* Admin Actions */}
                        <AdminNoticeActions
                          noticeId={notice.id}
                          isPinned={notice.isPinned}
                          onUpdated={fetchNotices}
                        />
                      </div>

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
                    </Link>
                  ))}
                </div>
              )}

              {/* Normal Notices */}
              <div className={styles.tableBody}>
                {normalNotices.map((notice, index) => (
                  <Link
                    key={notice.id}
                    href={`/notice/${notice.id}`}
                    className={`${styles.row} noticeRow`}
                  >
                    {/* Number */}
                    <div className={styles.cellNumber}>
                      {normalNotices.length - index}
                    </div>

                    {/* Category */}
                    <div className={styles.cellCategory}>
                      <span className={styles.categoryBadge}>{notice.category}</span>
                    </div>

                    {/* Title */}
                    <div className={styles.cellTitle}>
                      <h3 className={styles.postTitle}>{notice.title}</h3>
                      {isNew(notice.createdAt) && (
                        <span className={styles.newBadge}>N</span>
                      )}
                      {/* Admin Actions */}
                      <AdminNoticeActions
                        noticeId={notice.id}
                        isPinned={notice.isPinned}
                        onUpdated={fetchNotices}
                      />
                    </div>

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
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile List */}
            <div className={styles.mobileList}>
              {/* Pinned */}
              {pinnedNotices.map((notice) => (
                <Link
                  key={notice.id}
                  href={`/notice/${notice.id}`}
                  className={`${styles.mobileCard} ${styles.mobilePinned}`}
                >
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
                </Link>
              ))}
              {/* Normal */}
              {normalNotices.map((notice) => (
                <Link
                  key={notice.id}
                  href={`/notice/${notice.id}`}
                  className={styles.mobileCard}
                >
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
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled>«</button>
              <button className={styles.pageBtn} disabled>‹</button>
              <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
              <button className={styles.pageBtn}>2</button>
              <button className={styles.pageBtn}>3</button>
              <button className={styles.pageBtn}>›</button>
              <button className={styles.pageBtn}>»</button>
            </div>
          </>
        )}
        </div>
        <Footer />
      </div>
  )
}
