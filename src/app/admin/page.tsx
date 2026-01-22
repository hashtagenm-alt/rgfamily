'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users, Heart, Calendar, FileText, TrendingUp, Clock, Radio, Eye, RefreshCw, Film, PenTool, MessageSquare } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { StatsCard, DataTable, Column } from '@/components/admin'
import { useSupabaseContext } from '@/lib/context'
import { useLiveRoster } from '@/lib/hooks'
import type { JoinedProfile } from '@/types/common'
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
  totalDonations: number
  totalDonationAmount: number
  activeSeasons: number
  recentDonations: RecentDonation[]
  recentMembers: RecentMember[]
  // Content stats
  totalPosts: number
  totalMedia: number
  totalSignatures: number
}

interface DonationTrendData {
  date: string
  amount: number
  count: number
}

type TrendPeriod = '7d' | '30d' | '90d'

interface RecentDonation {
  id: number
  donorName: string
  amount: number
  createdAt: string
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
  const [trendData, setTrendData] = useState<DonationTrendData[]>([])
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('30d')
  const [isTrendLoading, setIsTrendLoading] = useState(false)

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

      // 후원 통계
      const { data: donationStats } = await supabase
        .from('donations')
        .select('amount')

      const totalDonations = donationStats?.length || 0
      const totalDonationAmount = donationStats?.reduce((sum, d) => sum + d.amount, 0) || 0

      // 활성 시즌
      const { count: activeSeasonCount } = await supabase
        .from('seasons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // 최근 후원
      const { data: recentDonations } = await supabase
        .from('donations')
        .select('id, amount, created_at, profiles!donor_id(nickname)')
        .order('created_at', { ascending: false })
        .limit(5)

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
        totalDonations,
        totalDonationAmount,
        activeSeasons: activeSeasonCount || 0,
        recentDonations: (recentDonations || []).map((d) => {
          const profile = d.profiles as JoinedProfile | null
          return {
            id: d.id,
            donorName: profile?.nickname || '익명',
            amount: d.amount,
            createdAt: d.created_at,
          }
        }),
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

  // 후원 추이 데이터 가져오기
  const fetchTrendData = useCallback(async (period: TrendPeriod) => {
    setIsTrendLoading(true)
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: donations } = await supabase
        .from('donations')
        .select('amount, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      // 날짜별로 그룹화
      const grouped = new Map<string, { amount: number; count: number }>()

      // 모든 날짜 초기화
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (days - 1 - i))
        const dateStr = date.toISOString().split('T')[0]
        grouped.set(dateStr, { amount: 0, count: 0 })
      }

      // 후원 데이터 집계
      donations?.forEach((d) => {
        const dateStr = d.created_at.split('T')[0]
        const existing = grouped.get(dateStr)
        if (existing) {
          grouped.set(dateStr, {
            amount: existing.amount + d.amount,
            count: existing.count + 1,
          })
        }
      })

      // 배열로 변환
      const trendArray: DonationTrendData[] = []
      grouped.forEach((value, key) => {
        trendArray.push({
          date: key,
          amount: value.amount,
          count: value.count,
        })
      })

      setTrendData(trendArray)
    } catch (error) {
      console.error('후원 추이 데이터 로드 실패:', error)
    }
    setIsTrendLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchTrendData(trendPeriod)
  }, [fetchTrendData, trendPeriod])

  const formatDateTime = (dateStr: string) =>
    formatDate(dateStr, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const donationColumns: Column<RecentDonation>[] = [
    { key: 'donorName', header: '후원자' },
    {
      key: 'amount',
      header: '금액',
      render: (item) => (
        <span className={styles.amountCell}>{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '일시',
      width: '140px',
      render: (item) => formatDateTime(item.createdAt),
    },
  ]

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
          title="전체 후원"
          value={stats?.totalDonations.toLocaleString() || '0'}
          icon={Heart}
          color="success"
          delay={0.1}
        />
        <StatsCard
          title="총 후원금"
          value={formatCurrency(stats?.totalDonationAmount || 0)}
          icon={TrendingUp}
          color="warning"
          delay={0.2}
        />
        <StatsCard
          title="활성 시즌"
          value={stats?.activeSeasons || '0'}
          icon={Calendar}
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

      {/* Donation Trend Chart */}
      <motion.section
        className={styles.chartSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className={styles.sectionHeader}>
          <div className={styles.chartHeaderLeft}>
            <TrendingUp size={20} />
            <h2>후원 추이</h2>
          </div>
          <div className={styles.periodSelector}>
            {(['7d', '30d', '90d'] as TrendPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTrendPeriod(period)}
                className={`${styles.periodBtn} ${trendPeriod === period ? styles.active : ''}`}
              >
                {period === '7d' ? '7일' : period === '30d' ? '30일' : '90일'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.chartContainer}>
          {isTrendLoading ? (
            <div className={styles.chartLoading}>
              <div className={styles.spinner} />
            </div>
          ) : trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-tertiary)"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="var(--text-tertiary)"
                  fontSize={12}
                  tickFormatter={(value) => {
                    if (value >= 10000) return `${(value / 10000).toFixed(0)}만`
                    return value.toLocaleString()
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--text-tertiary)"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value, name) => {
                    const numValue = typeof value === 'number' ? value : 0
                    if (name === 'amount') return [formatCurrency(numValue), '후원금']
                    return [numValue, '후원 건수']
                  }}
                  labelFormatter={(label) => {
                    const date = new Date(label as string)
                    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                  }}
                />
                <Legend
                  formatter={(value) => (value === 'amount' ? '후원금' : '후원 건수')}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: 'var(--primary)' }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-success)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: 'var(--color-success)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.noData}>
              <TrendingUp size={32} />
              <p>해당 기간의 후원 데이터가 없습니다</p>
            </div>
          )}
        </div>
      </motion.section>

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
      <div className={styles.activityGrid}>
        <motion.section
          className={styles.section}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className={styles.sectionHeader}>
            <Heart size={20} />
            <h2>최근 후원</h2>
          </div>
          <DataTable
            data={stats?.recentDonations || []}
            columns={donationColumns}
            searchable={false}
            itemsPerPage={5}
          />
        </motion.section>

        <motion.section
          className={styles.section}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
      </div>

      {/* Quick Actions */}
      <motion.section
        className={styles.quickActions}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2>빠른 작업</h2>
        <div className={styles.actionGrid}>
          <a href="/admin/donations" className={styles.actionCard}>
            <Heart size={24} />
            <span>후원 등록</span>
          </a>
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
