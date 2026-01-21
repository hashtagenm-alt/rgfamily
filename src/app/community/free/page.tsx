'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Eye, MessageSquare, ThumbsUp, PenLine, ChevronDown } from 'lucide-react'
import { PageLayout } from '@/components/layout'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthContext } from '@/lib/context'
import { getPosts } from '@/lib/actions/posts'
import { formatShortDate } from '@/lib/utils/format'
import TabFilter from '@/components/community/TabFilter'
import styles from './page.module.css'

interface Post {
  id: number
  title: string
  authorName: string
  authorRealName?: string // 관리자용 실제 닉네임
  isAnonymous: boolean
  viewCount: number
  commentCount: number
  likeCount: number
  createdAt: string
  category?: string
}

function isNew(dateStr: string): boolean {
  const postDate = new Date(dateStr)
  const now = new Date()
  const diffDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 1
}

function isHot(viewCount: number, commentCount: number, likeCount: number): boolean {
  return viewCount >= 100 || commentCount >= 10 || likeCount >= 20
}

function isPopular(likeCount: number): boolean {
  return likeCount >= 50
}

const POSTS_PER_PAGE = 20

export default function FreeBoardPage() {
  const { profile } = useAuthContext()
  const isAdmin = profile && ['admin', 'superadmin', 'moderator'].includes(profile.role)

  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'title' | 'author'>('all')
  const [sortBy, setSortBy] = useState<'latest' | 'views' | 'likes'>('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const tabs = [
    { label: '자유게시판', value: 'free', path: '/community/free' },
    { label: 'VIP 라운지', value: 'vip', path: '/community/vip' },
  ]

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1) // 검색 시 1페이지로
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchPosts = useCallback(async () => {
    setIsLoading(true)

    const result = await getPosts({
      boardType: 'free',
      page: currentPage,
      limit: POSTS_PER_PAGE,
      searchQuery: debouncedSearch,
      searchType
    })

    if (result.data) {
      setPosts(
        result.data.data.map((p) => {
          const isAnon = p.is_anonymous || false
          const realNickname = p.author_nickname || '알 수 없음'
          return {
            id: p.id,
            title: p.title,
            authorName: isAnon ? '익명' : realNickname,
            authorRealName: isAnon ? realNickname : undefined,
            isAnonymous: isAnon,
            viewCount: p.view_count || 0,
            commentCount: p.comment_count || 0,
            likeCount: p.like_count || 0,
            createdAt: p.created_at,
            category: '잡담',
          }
        })
      )
      setTotalCount(result.data.count)
    }

    setIsLoading(false)
  }, [currentPage, debouncedSearch, searchType])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // 클라이언트 측 정렬 (서버에서 이미 최신순으로 가져왔으므로)
  const sortedPosts = [...posts].sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return b.viewCount - a.viewCount
      case 'likes':
        return b.likeCount - a.likeCount
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE)

  // 페이지 버튼 목록 생성
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

  return (
    <PageLayout>
      <div className={styles.main}>
        <Navbar />
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>커뮤니티</h1>
            <p className={styles.subtitle}>RG FAMILY 팬들과 소통하는 자유 공간</p>
          </div>
        </section>

      <div className={styles.container}>
        {/* Tab Filter */}
        <TabFilter tabs={tabs} activeTab="free" />

        {/* Board Header */}
        <div className={styles.boardHeader}>
          {/* Left: Stats & Sort */}
          <div className={styles.boardLeft}>
            <span className={styles.totalCount}>
              전체 <strong>{sortedPosts.length}</strong>건
            </span>
            <div className={styles.sortSelect}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'latest' | 'views' | 'likes')}
                className={styles.select}
              >
                <option value="latest">최신순</option>
                <option value="views">조회순</option>
                <option value="likes">추천순</option>
              </select>
              <ChevronDown size={14} className={styles.selectIcon} />
            </div>
          </div>

          {/* Right: Search */}
          <div className={styles.searchArea}>
            <div className={styles.searchTypeSelect}>
              <select
                value={searchType}
                onChange={(e) => {
                  setSearchType(e.target.value as 'all' | 'title' | 'author')
                  setCurrentPage(1)
                }}
                className={styles.select}
              >
                <option value="all">전체</option>
                <option value="title">제목</option>
                <option value="author">작성자</option>
              </select>
              <ChevronDown size={14} className={styles.selectIcon} />
            </div>
            <div className={styles.searchBox}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="검색어를 입력하세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setDebouncedSearch(searchQuery)
                    setCurrentPage(1)
                  }
                }}
              />
              <button
                className={styles.searchBtn}
                onClick={() => {
                  setDebouncedSearch(searchQuery)
                  setCurrentPage(1)
                }}
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>게시글을 불러오는 중...</span>
          </div>
        ) : sortedPosts.length === 0 ? (
          <>
            <div className={styles.empty}>
              <p>등록된 게시글이 없습니다</p>
            </div>
            <div className={styles.boardFooter}>
              <div />
              <Link href="/community/write?board=free" className={styles.writeBtn}>
                <PenLine size={16} />
                글쓰기
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Board Table */}
            <div className={styles.board}>
              {/* Table Header */}
              <div className={styles.tableHeader}>
                <span className={styles.colNumber}>번호</span>
                <span className={styles.colCategory}>분류</span>
                <span className={styles.colTitle}>제목</span>
                <span className={styles.colAuthor}>글쓴이</span>
                <span className={styles.colDate}>작성일</span>
                <span className={styles.colViews}>조회</span>
                <span className={styles.colLikes}>추천</span>
              </div>

              {/* Table Body */}
              <div className={styles.tableBody}>
                {sortedPosts.map((post, index) => (
                  <Link
                    key={post.id}
                    href={`/community/free/${post.id}`}
                    className={`${styles.row} ${isPopular(post.likeCount) ? styles.popular : ''}`}
                  >
                    {/* Number */}
                    <div className={styles.cellNumber}>
                      {sortedPosts.length - index}
                    </div>

                    {/* Category */}
                    <div className={styles.cellCategory}>
                      <span className={styles.categoryBadge}>{post.category || '잡담'}</span>
                    </div>

                    {/* Title */}
                    <div className={styles.cellTitle}>
                      <h3 className={styles.postTitle}>{post.title}</h3>
                      <div className={styles.titleMeta}>
                        {post.commentCount > 0 && (
                          <span className={styles.commentCount}>
                            <MessageSquare size={12} />
                            {post.commentCount}
                          </span>
                        )}
                        {isNew(post.createdAt) && (
                          <span className={styles.newBadge}>N</span>
                        )}
                        {isHot(post.viewCount, post.commentCount, post.likeCount) && (
                          <span className={styles.hotBadge}>HOT</span>
                        )}
                        {isPopular(post.likeCount) && (
                          <span className={styles.popularBadge}>인기</span>
                        )}
                      </div>
                    </div>

                    {/* Author */}
                    <span className={styles.cellAuthor}>
                      {post.authorName}
                      {isAdmin && post.isAnonymous && post.authorRealName && (
                        <span className={styles.adminRealName}>({post.authorRealName})</span>
                      )}
                    </span>

                    {/* Date */}
                    <span className={styles.cellDate}>
                      {formatShortDate(post.createdAt)}
                    </span>

                    {/* Views */}
                    <span className={styles.cellViews}>
                      {post.viewCount.toLocaleString()}
                    </span>

                    {/* Likes */}
                    <span className={styles.cellLikes}>
                      {post.likeCount > 0 ? post.likeCount : '-'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className={styles.mobileList}>
              {sortedPosts.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/community/free/${post.id}`}
                  className={styles.mobileCard}
                >
                  <div className={styles.mobileHeader}>
                    <span className={styles.mobileCategoryBadge}>{post.category || '잡담'}</span>
                    {isNew(post.createdAt) && <span className={styles.newBadge}>N</span>}
                    {isHot(post.viewCount, post.commentCount, post.likeCount) && <span className={styles.hotBadge}>HOT</span>}
                  </div>
                  <h3 className={styles.mobileTitle}>
                    {post.title}
                    {post.commentCount > 0 && (
                      <span className={styles.mobileCommentCount}>[{post.commentCount}]</span>
                    )}
                  </h3>
                  <div className={styles.mobileMeta}>
                    <span className={styles.mobileAuthor}>
                      {post.authorName}
                      {isAdmin && post.isAnonymous && post.authorRealName && (
                        <span className={styles.adminRealName}>({post.authorRealName})</span>
                      )}
                    </span>
                    <span className={styles.mobileDivider}>·</span>
                    <span>{formatShortDate(post.createdAt)}</span>
                    <span className={styles.mobileDivider}>·</span>
                    <span className={styles.mobileStats}>
                      <Eye size={12} /> {post.viewCount}
                    </span>
                    <span className={styles.mobileStats}>
                      <ThumbsUp size={12} /> {post.likeCount}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Board Footer */}
            <div className={styles.boardFooter}>
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
              <Link href="/community/write?board=free" className={styles.writeBtn}>
                <PenLine size={16} />
                글쓰기
              </Link>
            </div>
          </>
        )}
        </div>
        <Footer />
      </div>
    </PageLayout>
  )
}
