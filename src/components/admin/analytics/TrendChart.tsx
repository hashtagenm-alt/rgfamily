'use client'

import { useMemo } from 'react'
import { Paper, Text, Group, Stack, Badge, SegmentedControl } from '@mantine/core'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { DailyTrendItem, SeasonComparisonItem, EpisodeDonationItem } from '@/lib/actions/analytics'

// 차트 타입
type ChartType = 'daily' | 'season' | 'episode'

interface TrendChartProps {
  // 데이터
  dailyData?: DailyTrendItem[]
  seasonData?: SeasonComparisonItem[]
  episodeData?: EpisodeDonationItem[]

  // 설정
  chartType: ChartType
  onChartTypeChange?: (type: ChartType) => void
  weeklyGrowth?: number
  monthlyGrowth?: number
  peakDate?: string
  peakAmount?: number

  // 스타일
  height?: number
}

// 숫자 포맷
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toLocaleString()
}

// 증감 아이콘
function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp size={14} />
  if (value < 0) return <TrendingDown size={14} />
  return <Minus size={14} />
}

// 커스텀 툴팁
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null

  return (
    <Paper p="sm" shadow="md" withBorder>
      <Text size="sm" fw={600} mb={4}>{label}</Text>
      {payload.map((entry, index) => (
        <Group key={index} gap={8}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: entry.color,
            }}
          />
          <Text size="xs" c="dimmed">{entry.name}:</Text>
          <Text size="xs" fw={500}>{formatNumber(entry.value)}</Text>
        </Group>
      ))}
    </Paper>
  )
}

export default function TrendChart({
  dailyData = [],
  seasonData = [],
  episodeData = [],
  chartType,
  onChartTypeChange,
  weeklyGrowth = 0,
  monthlyGrowth = 0,
  peakDate,
  peakAmount,
  height = 350,
}: TrendChartProps) {
  // 일별 차트 데이터
  const formattedDailyData = useMemo(() => {
    return dailyData.map(item => ({
      ...item,
      date: item.date.slice(5), // MM-DD 형식
    }))
  }, [dailyData])

  // 시즌 비교 차트 데이터
  const formattedSeasonData = useMemo(() => {
    return seasonData.map(item => ({
      ...item,
      name: item.seasonName,
    }))
  }, [seasonData])

  // 에피소드 차트 데이터
  const formattedEpisodeData = useMemo(() => {
    return episodeData.map(item => ({
      ...item,
      name: `EP${item.episodeNumber}`,
      fill: item.isRankBattle ? '#fd68ba' : '#8884d8',
    }))
  }, [episodeData])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          {/* 헤더 */}
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="lg" fw={600}>후원 트렌드</Text>
              <Group gap="xs">
                {weeklyGrowth !== 0 && (
                  <Badge
                    size="sm"
                    variant="light"
                    color={weeklyGrowth > 0 ? 'green' : weeklyGrowth < 0 ? 'red' : 'gray'}
                    leftSection={<TrendIcon value={weeklyGrowth} />}
                  >
                    주간 {weeklyGrowth > 0 ? '+' : ''}{weeklyGrowth}%
                  </Badge>
                )}
                {monthlyGrowth !== 0 && (
                  <Badge
                    size="sm"
                    variant="light"
                    color={monthlyGrowth > 0 ? 'green' : monthlyGrowth < 0 ? 'red' : 'gray'}
                    leftSection={<TrendIcon value={monthlyGrowth} />}
                  >
                    월간 {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth}%
                  </Badge>
                )}
                {peakDate && peakAmount && (
                  <Badge size="sm" variant="light" color="pink">
                    피크: {peakDate} ({formatNumber(peakAmount)} 하트)
                  </Badge>
                )}
              </Group>
            </Stack>

            {/* 차트 타입 선택 */}
            {onChartTypeChange && (
              <SegmentedControl
                size="xs"
                value={chartType}
                onChange={(value) => onChartTypeChange(value as ChartType)}
                data={[
                  { label: '일별', value: 'daily' },
                  { label: '시즌별', value: 'season' },
                  { label: '에피소드별', value: 'episode' },
                ]}
              />
            )}
          </Group>

          {/* 차트 */}
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              {chartType === 'daily' ? (
                <LineChart data={formattedDailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalHearts"
                    name="후원 하트"
                    stroke="#fd68ba"
                    strokeWidth={2}
                    dot={{ fill: '#fd68ba', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="donorCount"
                    name="후원자 수"
                    stroke="#00d4ff"
                    strokeWidth={2}
                    dot={{ fill: '#00d4ff', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : chartType === 'season' ? (
                <BarChart data={formattedSeasonData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="totalHearts"
                    name="총 후원"
                    fill="#fd68ba"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="totalDonors"
                    name="후원자 수"
                    fill="#00d4ff"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <BarChart data={formattedEpisodeData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="totalHearts"
                    name="후원 하트"
                    fill="#fd68ba"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* 범례 설명 */}
          {chartType === 'episode' && (
            <Group gap="md" justify="center">
              <Group gap={4}>
                <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#fd68ba' }} />
                <Text size="xs" c="dimmed">직급전</Text>
              </Group>
              <Group gap={4}>
                <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#8884d8' }} />
                <Text size="xs" c="dimmed">일반 에피소드</Text>
              </Group>
            </Group>
          )}
        </Stack>
      </Paper>
    </motion.div>
  )
}
