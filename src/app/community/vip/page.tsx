'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MessageSquare, Eye, Crown, Lock, Search, ChevronDown } from 'lucide-react'
import { PageLayout } from '@/components/layout'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthContext } from '@/lib/context'
import { useVipStatus } from '@/lib/hooks'
import { getPosts } from '@/lib/actions/posts'
import { formatShortDate } from '@/lib/utils/format'
import TabFilter from '@/components/community/TabFilter'
import styles from '../free/page.module.css'

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
}

const POSTS_PER_PAGE = 20

export default function VipBoardPage() {
  const { user, profile } = useAuthContext()
  const isAdmin = profile && ['admin', 'superadmin', 'moderator'].includes(profile.role)
  const { isVip, isLoading: vipStatusLoading } = useVipStatus()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'title' | 'author'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const tabs = [
    { label: '자유게시판 (FREE)', value: 'free', path: '/community/free' },
    { label: 'VIP 라운지 (VIP)', value: 'vip', path: '/community/vip' },
  ]

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchPosts = useCallback(async () => {
    if (vipStatusLoading) {
      return
    }

    if (!isVip) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const result = await getPosts({
      boardType: 'vip',
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
          }
        })
      )
      setTotalCount(result.data.count)
    }

    setIsLoading(false)
  }, [isVip, vipStatusLoading, currentPage, debouncedSearch, searchType])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE)

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
        {/* VIP Hero Section */}
        <section className={`${styles.hero} ${styles.vipHero}`}>
          <div className={styles.heroContent}>
            <div className={styles.vipTitleRow}>
              <Crown size={32} className={styles.vipCrown} />
              <h1 className={styles.title}>VIP LOUNGE</h1>
            </div>
            <p className={styles.subtitle}>VIP 후원자 전용 프리미엄 커뮤니티</p>
          </div>
        </section>

      <div className={styles.container}>
        <TabFilter tabs={tabs} activeTab="vip" />

        {/* 검색 영역 (VIP 권한 있을 때만) */}
        {isVip && !vipStatusLoading && (
          <div className={styles.boardHeader}>
            <div className={styles.boardLeft}>
              <span className={styles.totalCount}>
                전체 <strong>{totalCount}</strong>건
              </span>
            </div>
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
        )}

        {!user ? (
          <div className={styles.locked}>
            <Lock size={48} />
            <h3>로그인이 필요합니다</h3>
            <p>VIP 라운지에 접근하려면 로그인해주세요.</p>
            <Link href="/login" className={styles.loginBtn}>로그인</Link>
          </div>
        ) : vipStatusLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>VIP 권한 확인 중...</span>
          </div>
        ) : !isVip ? (
          <div className={styles.locked}>
            <Crown size={48} style={{ color: '#ffd700' }} />
            <h3>VIP 전용 공간입니다</h3>
            <p>후원 랭킹 <strong>Top 50</strong>만 VIP 라운지 이용이 가능합니다.</p>
            <Link href="/ranking" className={styles.loginBtn}>후원 랭킹 보기</Link>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>게시글을 불러오는 중...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <p>등록된 게시글이 없습니다</p>
          </div>
        ) : (
          <div className={`${styles.board} ${styles.vipBoard}`}>
            <div className={styles.tableHeader}>
              <span className={styles.colNumber}>번호</span>
              <span className={styles.colTitle}>제목</span>
              <span className={styles.colAuthor}>글쓴이</span>
              <span className={styles.colDate}>작성일</span>
              <span className={styles.colViews}>조회</span>
            </div>
            <div className={styles.tableBody}>
              {posts.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/community/vip/${post.id}`}
                  className={`${styles.row} ${styles.vipRow}`}
                >
                  <div className={styles.cellNumber}>{posts.length - index}</div>
                  <div className={styles.cellTitle}>
                    <h3 className={styles.postTitle}>{post.title}</h3>
                    <div className={styles.titleMeta}>
                      {post.commentCount > 0 && (
                        <span className={styles.commentCount}>
                          <MessageSquare size={12} />
                          {post.commentCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`${styles.cellAuthor} ${styles.authorVip}`}>
                    <Crown size={10} />
                    {post.authorName}
                    {isAdmin && post.isAnonymous && post.authorRealName && (
                      <span className={styles.adminRealName}>({post.authorRealName})</span>
                    )}
                  </span>
                  <span className={styles.cellDate}>{formatShortDate(post.createdAt)}</span>
                  <span className={styles.cellViews}>{post.viewCount.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {isVip && (
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
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
              <button
                className={styles.pageBtn}
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(totalPages)}
              >
                »
              </button>
            </div>
            <Link href="/community/write?board=vip" className={`${styles.writeBtn} ${styles.vipWriteBtn}`}>
              <Crown size={14} />
              글쓰기
            </Link>
          </div>
        )}
        </div>
        <Footer />
      </div>
    </PageLayout>
  )
}
