'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MessageSquare, Eye, ChevronRight, Crown, Lock } from 'lucide-react'
import { PageLayout } from '@/components/layout'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useSupabaseContext, useAuthContext } from '@/lib/context'
import { useVipStatus } from '@/lib/hooks'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { logger } from '@/lib/utils/logger'
import { formatShortDate } from '@/lib/utils/format'
import TabFilter from '@/components/community/TabFilter'
import type { JoinedProfile } from '@/types/common'
import styles from '../free/page.module.css'

interface Post {
  id: number
  title: string
  authorName: string
  authorRealName?: string // 관리자용 실제 닉네임
  isAnonymous: boolean
  viewCount: number
  commentCount: number
  createdAt: string
}

export default function VipBoardPage() {
  const supabase = useSupabaseContext()
  const { user, profile } = useAuthContext()
  const isAdmin = profile && ['admin', 'superadmin', 'moderator'].includes(profile.role)
  const { isVip, isLoading: vipStatusLoading } = useVipStatus()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const tabs = [
    { label: '자유게시판 (FREE)', value: 'free', path: '/community/free' },
    { label: 'VIP 라운지 (VIP)', value: 'vip', path: '/community/vip' },
  ]

  const fetchPosts = useCallback(async () => {
    if (vipStatusLoading) {
      return
    }

    if (!isVip) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const { data, error } = await withRetry(async () =>
      await supabase
        .from('posts')
        .select('id, title, view_count, is_anonymous, created_at, profiles!author_id(nickname), comments(id)')
        .eq('board_type', 'vip')
        .order('created_at', { ascending: false })
        .limit(20)
    )

    if (error) {
      logger.dbError('select', 'posts', error)
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
            createdAt: p.created_at,
          }
        })
      )
    }

    setIsLoading(false)
  }, [supabase, isVip, vipStatusLoading])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])


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
              <button className={styles.pageBtn} disabled>«</button>
              <button className={`${styles.pageBtn} ${styles.active}`}>1</button>
              <button className={styles.pageBtn}>»</button>
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
