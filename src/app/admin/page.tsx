'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users, Heart, Calendar, FileText, TrendingUp, Clock, Radio, Eye, RefreshCw, Film, PenTool, MessageSquare } from 'lucide-react'
import { StatsCard, DataTable, Column } from '@/components/admin'
import { useSupabaseContext } from '@/lib/context'
import { useLiveRoster } from '@/lib/hooks'
import styles from './page.module.css'

// Local helper functions
const formatCurrency = (amount: number): string => {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억 하트`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}만 하트`;
  }
  return `${amount.toLocaleString()} 하트`;
};

interface FormatDateOptions {
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
}

const formatDate = (dateStr: string, options?: FormatDateOptions): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', options);
};

interface DashboardStats {
  totalMembers: number
  // 시즌 랭킹 통계
  seasonDonorCount: number
  seasonTotalAmount: number
  // 전체 랭킹 통계
  totalDonorCount: number
  totalDonationAmount: number
  activeSeasons: number
  recentMembers: RecentMember[]
  // Content stats
  totalPosts: number
  totalMedia: number
  totalSignatures: number
}

interface RecentMember {
  id: string
  nickname: string
  email: string
  createdAt: string
}

export default function AdminDashboardPage() {
  const supabase = useSupabaseContext()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 실시간 라이브 상태
  const { members, liveStatusByMemberId, isLoading: liveLoading, refetch: refetchLive } = useLiveRoster({ realtime: true })
  const liveMembers = members.filter(m => m.is_live)
  const totalViewers = Object.values(liveStatusByMemberId)
    .flat()
    .filter(status => status.isLive)
    .reduce((sum, status) => sum + status.viewerCount, 0)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)

    try {
      // 회원 수
      const { count: memberCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // 시즌 랭킹 통계 (season_donation_rankings)
      const { data: seasonRankings } = await supabase
        .from('season_donation_rankings')
        .select('total_amount, donation_count')

      const seasonDonorCount = seasonRankings?.length || 0
      const seasonTotalAmount = seasonRankings?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0

      // 전체 랭킹 통계 (total_donation_rankings)
      const { data: totalRankings } = await supabase
        .from('total_donation_rankings')
        .select('total_amount')

      const totalDonorCount = totalRankings?.length || 0
      const totalDonationAmount = totalRankings?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0

      // 활성 시즌
      const { count: activeSeasonCount } = await supabase
        .from('seasons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // 최근 가입
      const { data: recentMembers } = await supabase
        .from('profiles')
        .select('id, nickname, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      // 콘텐츠 통계 - 병렬 처리
      const [postsCount, mediaCount, signaturesCount] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('media_content').select('*', { count: 'exact', head: true }),
        supabase.from('signatures').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        totalMembers: memberCount || 0,
        seasonDonorCount,
        seasonTotalAmount,
        totalDonorCount,
        totalDonationAmount,
        activeSeasons: activeSeasonCount || 0,
        recentMembers: (recentMembers || []).map((m) => ({
          id: m.id,
          nickname: m.nickname,
          email: m.email || '',
          createdAt: m.created_at,
        })),
        totalPosts: postsCount.count || 0,
        totalMedia: mediaCount.count || 0,
        totalSignatures: signaturesCount.count || 0,
      })
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    }

    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const formatDateTime = (dateStr: string) =>
    formatDate(dateStr, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const memberColumns: Column<RecentMember>[] = [
    { key: 'nickname', header: '닉네임' },
    { key: 'email', header: '이메일' },
    {
      key: 'createdAt',
      header: '가입일',
      width: '140px',
      render: (item) => formatDateTime(item.createdAt),
    },
  ]

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>대시보드 로딩 중...</span>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>대시보드</h1>
        <p className={styles.subtitle}>RG 패밀리 관리자 페이지</p>
      </header>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <StatsCard
          title="전체 회원"
          value={stats?.totalMembers.toLocaleString() || '0'}
          icon={Users}
          color="primary"
          delay={0}
        />
        <StatsCard
          title="시즌 후원자"
          value={stats?.seasonDonorCount.toLocaleString() || '0'}
          icon={Heart}
          color="success"
          delay={0.1}
        />
        <StatsCard
          title="시즌 후원금"
          value={formatCurrency(stats?.seasonTotalAmount || 0)}
          icon={TrendingUp}
          color="warning"
          delay={0.2}
        />
        <StatsCard
          title="전체 후원금"
          value={formatCurrency(stats?.totalDonationAmount || 0)}
          icon={TrendingUp}
          color="info"
          delay={0.3}
        />
      </div>

      {/* Content Stats */}
      <motion.div
        className={styles.contentStatsGrid}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className={styles.contentStatCard}>
          <MessageSquare size={20} className={styles.contentStatIcon} />
          <div className={styles.contentStatInfo}>
            <span className={styles.contentStatValue}>{stats?.totalPosts || 0}</span>
            <span className={styles.contentStatLabel}>게시글</span>
          </div>
        </div>
        <div className={styles.contentStatCard}>
          <Film size={20} className={styles.contentStatIcon} />
          <div className={styles.contentStatInfo}>
            <span className={styles.contentStatValue}>{stats?.totalMedia || 0}</span>
            <span className={styles.contentStatLabel}>미디어</span>
          </div>
        </div>
        <div className={styles.contentStatCard}>
          <PenTool size={20} className={styles.contentStatIcon} />
          <div className={styles.contentStatInfo}>
            <span className={styles.contentStatValue}>{stats?.totalSignatures || 0}</span>
            <span className={styles.contentStatLabel}>시그니처</span>
          </div>
        </div>
      </motion.div>

      {/* Live Status Section */}
      <motion.section
        className={styles.liveSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className={styles.sectionHeader}>
          <div className={styles.liveHeaderLeft}>
            <Radio size={20} className={styles.liveIcon} />
            <h2>실시간 라이브 현황</h2>
            {liveMembers.length > 0 && (
              <span className={styles.liveBadge}>{liveMembers.length} LIVE</span>
            )}
          </div>
          <button
            onClick={() => refetchLive()}
            className={styles.refreshBtn}
            disabled={liveLoading}
          >
            <RefreshCw size={16} className={liveLoading ? styles.spinning : ''} />
            <span>새로고침</span>
          </button>
        </div>

        <div className={styles.liveStatsRow}>
          <div className={styles.liveStat}>
            <Radio size={18} className={styles.liveStatIcon} />
            <div className={styles.liveStatInfo}>
              <span className={styles.liveStatValue}>{liveMembers.length}</span>
              <span className={styles.liveStatLabel}>방송 중</span>
            </div>
          </div>
          <div className={styles.liveStat}>
            <Eye size={18} />
            <div className={styles.liveStatInfo}>
              <span className={styles.liveStatValue}>{totalViewers.toLocaleString()}</span>
              <span className={styles.liveStatLabel}>총 시청자</span>
            </div>
          </div>
          <div className={styles.liveStat}>
            <Users size={18} />
            <div className={styles.liveStatInfo}>
              <span className={styles.liveStatValue}>{members.length}</span>
              <span className={styles.liveStatLabel}>전체 멤버</span>
            </div>
          </div>
        </div>

        {liveMembers.length > 0 ? (
          <div className={styles.liveList}>
            {liveMembers.map((member) => {
              const liveEntries = liveStatusByMemberId[member.id] || []
              const activeLive = liveEntries.find(e => e.isLive)
              return (
                <div key={member.id} className={styles.liveCard}>
                  <div className={styles.liveCardHeader}>
                    <div className={styles.liveIndicator} />
                    <span className={styles.liveName}>{member.name}</span>
                    <span className={`${styles.liveUnit} ${member.unit === 'excel' ? styles.excel : styles.crew}`}>
                      {member.unit === 'excel' ? 'EXCEL' : 'CREW'}
                    </span>
                  </div>
                  {activeLive && (
                    <div className={styles.liveCardStats}>
                      <span className={styles.livePlatform}>{activeLive.platform}</span>
                      <span className={styles.liveViewers}>
                        <Eye size={12} />
                        {activeLive.viewerCount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className={styles.noLive}>
            <Radio size={24} />
            <p>현재 방송 중인 멤버가 없습니다</p>
          </div>
        )}
      </motion.section>

      {/* Recent Activity */}
      <motion.section
        className={styles.section}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className={styles.sectionHeader}>
          <Users size={20} />
          <h2>최근 가입</h2>
        </div>
        <DataTable
          data={stats?.recentMembers || []}
          columns={memberColumns}
          searchable={false}
          itemsPerPage={5}
        />
      </motion.section>

      {/* Quick Actions */}
      <motion.section
        className={styles.quickActions}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2>빠른 작업</h2>
        <div className={styles.actionGrid}>
          <a href="/admin/schedules" className={styles.actionCard}>
            <Calendar size={24} />
            <span>일정 추가</span>
          </a>
          <a href="/admin/notices" className={styles.actionCard}>
            <FileText size={24} />
            <span>공지 작성</span>
          </a>
          <a href="/admin/seasons" className={styles.actionCard}>
            <Clock size={24} />
            <span>시즌 관리</span>
          </a>
        </div>
      </motion.section>
    </div>
  )
}
