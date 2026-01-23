'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Paper,
  Text,
  Group,
  Stack,
  Select,
  Tabs,
  Loader,
  SimpleGrid,
} from '@mantine/core'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Heart,
  Users,
  Crown,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { StatsCard } from '@/components/admin'
import { TrendChart, DataVerificationTable } from '@/components/admin/analytics'
import { useAnalytics } from '@/lib/hooks/useAnalytics'
import { useSupabaseContext } from '@/lib/context'
import type { PeriodType } from '@/lib/actions/analytics'
import styles from './page.module.css'

// 기간 선택 옵션
const periodOptions = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: '90d', label: '최근 90일' },
  { value: 'all', label: '전체 기간' },
]

// 숫자 포맷
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 10000) {
    return `${Math.floor(num / 10000)}만`
  }
  return num.toLocaleString()
}

export default function AnalyticsPage() {
  const supabase = useSupabaseContext()
  const [activeTab, setActiveTab] = useState<string | null>('trend')
  const [chartType, setChartType] = useState<'daily' | 'season' | 'episode'>('daily')

  // 시즌 목록
  const [seasons, setSeasons] = useState<{ id: number; name: string }[]>([])

  // 분석 훅
  const {
    donationStats,
    seasonComparison,
    episodeDonations,
    verificationData,
    trendAnalysis,
    vipStats,
    activeDonorStats,
    isLoading,
    error,
    period,
    selectedSeasonId,
    setPeriod,
    setSelectedSeasonId,
    refetch,
    fetchEpisodeDonations,
    fetchVerificationData,
  } = useAnalytics()

  // 시즌 목록 로드
  useEffect(() => {
    const loadSeasons = async () => {
      const { data } = await supabase
        .from('seasons')
        .select('id, name')
        .order('id', { ascending: false })

      if (data) {
        setSeasons(data)
        // 기본값: 활성 시즌 또는 첫 번째 시즌
        const activeSeason = await supabase
          .from('seasons')
          .select('id')
          .eq('is_active', true)
          .single()

        if (activeSeason.data && !selectedSeasonId) {
          setSelectedSeasonId(activeSeason.data.id)
        } else if (data.length > 0 && !selectedSeasonId) {
          setSelectedSeasonId(data[0].id)
        }
      }
    }
    loadSeasons()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // 시즌 변경 시 에피소드 데이터 로드
  useEffect(() => {
    if (selectedSeasonId && chartType === 'episode') {
      fetchEpisodeDonations(selectedSeasonId)
    }
  }, [selectedSeasonId, chartType, fetchEpisodeDonations])

  // 탭 변경 시 데이터 로드
  const handleTabChange = useCallback((value: string | null) => {
    setActiveTab(value)
    if (value === 'comparison' && selectedSeasonId) {
      fetchVerificationData(selectedSeasonId)
    }
  }, [selectedSeasonId, fetchVerificationData])

  // 현재 시즌 이름 찾기
  const currentSeasonName = seasons.find(s => s.id === selectedSeasonId)?.name || ''

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Group gap="sm">
            <BarChart3 size={28} className={styles.headerIcon} />
            <div>
              <h1>분석 대시보드</h1>
              <p>후원 데이터 트렌드 분석 및 검증</p>
            </div>
          </Group>
        </div>

        <Group gap="sm">
          <Select
            size="sm"
            placeholder="기간 선택"
            data={periodOptions}
            value={period}
            onChange={(value) => value && setPeriod(value as PeriodType)}
            style={{ width: 140 }}
          />
          <Select
            size="sm"
            placeholder="시즌 선택"
            data={seasons.map(s => ({ value: String(s.id), label: s.name }))}
            value={selectedSeasonId ? String(selectedSeasonId) : null}
            onChange={(value) => value && setSelectedSeasonId(Number(value))}
            style={{ width: 140 }}
          />
          <button onClick={refetch} className={styles.refreshBtn} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
            <span>새로고침</span>
          </button>
        </Group>
      </header>

      {/* 에러 표시 */}
      {error && (
        <Paper p="sm" bg="red.0" radius="sm" mb="md">
          <Group gap="xs">
            <AlertCircle size={16} color="var(--mantine-color-red-6)" />
            <Text size="sm" c="red.7">{error}</Text>
          </Group>
        </Paper>
      )}

      {/* 로딩 */}
      {isLoading && !donationStats ? (
        <div className={styles.loading}>
          <Loader size="lg" color="pink" />
          <Text c="dimmed" mt="md">데이터 로딩 중...</Text>
        </div>
      ) : (
        <>
          {/* 통계 카드 */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
            <StatsCard
              title="총 후원 하트"
              value={formatNumber(donationStats?.totalHearts || 0)}
              change={donationStats?.changeRates.heartsChange}
              icon={Heart}
              color="primary"
              delay={0}
            />
            <StatsCard
              title="VIP 회원"
              value={vipStats?.totalVips || 0}
              change={vipStats?.change}
              icon={Crown}
              color="warning"
              delay={0.1}
            />
            <StatsCard
              title="평균 후원"
              value={formatNumber(donationStats?.averageDonation || 0)}
              change={donationStats?.changeRates.averageChange}
              icon={TrendingUp}
              color="success"
              delay={0.2}
            />
            <StatsCard
              title="활성 후원자"
              value={activeDonorStats?.activeDonors || 0}
              change={activeDonorStats?.change}
              icon={Users}
              color="info"
              delay={0.3}
            />
          </SimpleGrid>

          {/* 탭 */}
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab value="trend">트렌드</Tabs.Tab>
              <Tabs.Tab value="comparison">데이터 비교</Tabs.Tab>
              <Tabs.Tab value="detail">상세 통계</Tabs.Tab>
            </Tabs.List>

            {/* 트렌드 탭 */}
            <Tabs.Panel value="trend" pt="xl">
              <TrendChart
                dailyData={trendAnalysis?.daily || []}
                seasonData={seasonComparison}
                episodeData={episodeDonations}
                chartType={chartType}
                onChartTypeChange={setChartType}
                weeklyGrowth={trendAnalysis?.weeklyGrowth}
                monthlyGrowth={trendAnalysis?.monthlyGrowth}
                peakDate={trendAnalysis?.peakDate}
                peakAmount={trendAnalysis?.peakAmount}
              />
            </Tabs.Panel>

            {/* 데이터 비교 탭 */}
            <Tabs.Panel value="comparison" pt="xl">
              <DataVerificationTable
                data={verificationData}
                seasonName={currentSeasonName}
                isLoading={isLoading}
              />
            </Tabs.Panel>

            {/* 상세 통계 탭 */}
            <Tabs.Panel value="detail" pt="xl">
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {/* 시즌별 비교 카드 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Paper withBorder p="lg" radius="md">
                    <Stack gap="md">
                      <Text size="lg" fw={600}>시즌별 비교</Text>
                      <div className={styles.seasonCompareList}>
                        {seasonComparison.map((season, index) => (
                          <div key={season.seasonId} className={styles.seasonCompareItem}>
                            <div className={styles.seasonInfo}>
                              <Text fw={500}>{season.seasonName}</Text>
                              <Text size="sm" c="dimmed">
                                {season.episodeCount}개 에피소드
                              </Text>
                            </div>
                            <div className={styles.seasonStats}>
                              <div>
                                <Text size="xs" c="dimmed">총 후원</Text>
                                <Text fw={600}>{formatNumber(season.totalHearts)}</Text>
                              </div>
                              <div>
                                <Text size="xs" c="dimmed">후원자</Text>
                                <Text fw={600}>{season.totalDonors}명</Text>
                              </div>
                              <div>
                                <Text size="xs" c="dimmed">회차 평균</Text>
                                <Text fw={600}>{formatNumber(season.averagePerEpisode)}</Text>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Stack>
                  </Paper>
                </motion.div>

                {/* 기간 통계 카드 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Paper withBorder p="lg" radius="md">
                    <Stack gap="md">
                      <Text size="lg" fw={600}>기간별 통계</Text>
                      <div className={styles.periodStats}>
                        <div className={styles.periodStatRow}>
                          <Text c="dimmed">현재 기간 총 후원</Text>
                          <Text fw={600}>{formatNumber(donationStats?.totalHearts || 0)} 하트</Text>
                        </div>
                        <div className={styles.periodStatRow}>
                          <Text c="dimmed">이전 기간 총 후원</Text>
                          <Text fw={600}>{formatNumber(donationStats?.previousPeriod.totalHearts || 0)} 하트</Text>
                        </div>
                        <div className={styles.periodStatRow}>
                          <Text c="dimmed">현재 기간 후원 건수</Text>
                          <Text fw={600}>{donationStats?.donationCount || 0}건</Text>
                        </div>
                        <div className={styles.periodStatRow}>
                          <Text c="dimmed">이전 기간 후원 건수</Text>
                          <Text fw={600}>{donationStats?.previousPeriod.donationCount || 0}건</Text>
                        </div>
                        <div className={styles.periodStatRow}>
                          <Text c="dimmed">현재 기간 후원자 수</Text>
                          <Text fw={600}>{donationStats?.totalDonors || 0}명</Text>
                        </div>
                        <div className={styles.periodStatRow}>
                          <Text c="dimmed">이전 기간 후원자 수</Text>
                          <Text fw={600}>{donationStats?.previousPeriod.totalDonors || 0}명</Text>
                        </div>
                      </div>
                    </Stack>
                  </Paper>
                </motion.div>
              </SimpleGrid>
            </Tabs.Panel>
          </Tabs>
        </>
      )}
    </div>
  )
}
