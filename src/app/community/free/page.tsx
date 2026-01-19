'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Eye, MessageSquare, ThumbsUp, PenLine, ChevronDown } from 'lucide-react'
import { PageLayout } from '@/components/layout'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useSupabaseContext, useAuthContext } from '@/lib/context'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { formatShortDate } from '@/lib/utils/format'
import TabFilter from '@/components/community/TabFilter'
import type { JoinedProfile } from '@/types/common'
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

export default function FreeBoardPage() {
  const supabase = useSupabaseContext()
  const { profile } = useAuthContext()
  const isAdmin = profile && ['admin', 'superadmin', 'moderator'].includes(profile.role)

  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'title' | 'author'>('all')
  const [sortBy, setSortBy] = useState<'latest' | 'views' | 'likes'>('latest')

  const tabs = [
    { label: '자유게시판', value: 'free', path: '/community/free' },
    { label: 'VIP 라운지', value: 'vip', path: '/community/vip' },
  ]

  const fetchPosts = useCallback(async () => {
    setIsLoading(true)

    const { data, error } = await withRetry(async () =>
      await supabase
        .from('posts')
        .select('id, title, view_count, like_count, created_at, is_anonymous, profiles!author_id(nickname), comments(id)')
        .eq('board_type', 'free')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(20)
    )

    if (error) {
      console.error('게시글 로드 실패:', error)
    } else {
      setPosts(
        (data || []).map((p) => {
          const postProfile = p.profiles as JoinedProfile | null
          const comments = p.comments as unknown[] | null
          const isAnon = (p as { is_anonymous?: boolean }).is_anonymous || false
          const realNickname = postProfile?.nickname || '알 수 없음'
          return {
            id: p.id,
            title: p.title,
            authorName: isAnon ? '익명' : realNickname,
            authorRealName: isAnon ? realNickname : undefined,
            isAnonymous: isAnon,
            viewCount: p.view_count || 0,
            commentCount: comments?.length || 0,
            likeCount: p.like_count || 0,
            createdAt: p.created_at,
            category: '잡담',
          }
        })
      )
    }

    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // 검색 필터링
  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    switch (searchType) {
      case 'title':
        return post.title.toLowerCase().includes(query)
      case 'author':
        return post.authorName.toLowerCase().includes(query)
      default:
        return post.title.toLowerCase().includes(query) ||
          post.authorName.toLowerCase().includes(query)
    }
  })

  // 정렬
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return b.viewCount - a.viewCount
      case 'likes':
        return b.likeCount - a.likeCount
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

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
                onChange={(e) => setSearchType(e.target.value as 'all' | 'title' | 'author')}
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
                onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
              />
              <button className={styles.searchBtn}>
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
                <button className={styles.pageBtn} disabled>«</button>
                <button className={styles.pageBtn} disabled>‹</button>
                <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
                <button className={styles.pageBtn}>2</button>
                <button className={styles.pageBtn}>3</button>
                <button className={styles.pageBtn}>4</button>
                <button className={styles.pageBtn}>5</button>
                <button className={styles.pageBtn}>›</button>
                <button className={styles.pageBtn}>»</button>
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
