'use client'

import { ReactNode } from 'react'
import {
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import styles from './RechartsTheme.module.css'

// ==================== 차트 컬러 팔레트 ====================

export const CHART_COLORS = [
  '#fd68ba', // 핑크 (브랜드)
  '#3b82f6', // 블루
  '#10b981', // 그린
  '#f59e0b', // 앰버
  '#8b5cf6', // 퍼플
  '#06b6d4', // 시안
  '#ef4444', // 레드
] as const

// ==================== 차트 테마 설정 ====================

export const CHART_THEME = {
  grid: {
    stroke: 'rgba(255,255,255,0.08)',
    strokeDasharray: '3 3',
  },
  axis: {
    stroke: 'rgba(255,255,255,0.2)',
    tick: { fill: 'rgba(255,255,255,0.5)', fontSize: 12 },
  },
  tooltip: {
    bg: 'rgba(24, 24, 27, 0.95)',
    border: 'rgba(255,255,255,0.1)',
    text: '#f4f4f5',
    label: 'rgba(255,255,255,0.6)',
  },
} as const

// ==================== 숫자 포맷 (한국어 로케일) ====================

export function formatChartNumber(value: number): string {
  if (value >= 100000) return `${(value / 10000).toFixed(1)}만`
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만`
  return value.toLocaleString()
}

// ==================== 커스텀 툴팁 ====================

interface ChartTooltipPayload {
  name?: string
  value?: number
  color?: string
  dataKey?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipContent({ active, payload, label, labelFormatter, valueFormatter }: any) {
  if (!active || !payload || payload.length === 0) return null

  const displayLabel = labelFormatter ? labelFormatter(String(label), payload) : label

  return (
    <div className={styles.tooltip}>
      {displayLabel && <div className={styles.tooltipLabel}>{String(displayLabel)}</div>}
      <div className={styles.tooltipItems}>
        {(payload as ChartTooltipPayload[]).map((item, i) => (
          <div key={i} className={styles.tooltipItem}>
            <span className={styles.tooltipDot} style={{ background: item.color }} />
            <span className={styles.tooltipName}>{item.name}</span>
            <span className={styles.tooltipValue}>
              {valueFormatter
                ? valueFormatter(item.value ?? 0, item.name ?? '')
                : formatChartNumber(item.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ChartTooltipProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelFormatter?: (label: string, payload?: any[]) => string
  valueFormatter?: (value: number, name: string) => string
}

export function ChartTooltip({ labelFormatter, valueFormatter }: ChartTooltipProps) {
  return (
    <Tooltip
      content={(props) => (
        <TooltipContent {...props} labelFormatter={labelFormatter} valueFormatter={valueFormatter} />
      )}
    />
  )
}

// ==================== 차트 컨테이너 래퍼 ====================

interface ChartContainerProps {
  children: ReactNode
  height?: number
  title?: string
  subtitle?: string
  className?: string
}

export function ChartContainer({
  children,
  height = 350,
  title,
  subtitle,
  className,
}: ChartContainerProps) {
  return (
    <div className={`${styles.chartContainer} ${className || ''}`}>
      {(title || subtitle) && (
        <div className={styles.chartHeader}>
          {title && <h4 className={styles.chartTitle}>{title}</h4>}
          {subtitle && <p className={styles.chartSubtitle}>{subtitle}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}
