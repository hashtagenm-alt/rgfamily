'use client'

import { useMemo } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import type { Column } from '@/components/admin'
import type { Season } from '@/types/database'
import {
  type TimelineEventUI,
  categoryLabels,
  categoryColors,
  isFutureDate,
  formatDate,
} from './types'
import styles from '../../shared.module.css'

interface UseTimelineColumnsOptions {
  seasons: Season[]
}

export function useTimelineColumns({ seasons }: UseTimelineColumnsOptions) {
  const seasonOptions = useMemo(() => [
    { value: '', label: '-' },
    ...seasons.map(s => ({ value: String(s.id), label: s.name })),
  ], [seasons])

  const categoryOptions = useMemo(() => [
    { value: '', label: '-' },
    ...Object.entries(categoryLabels).map(([key, label]) => ({ value: key, label })),
  ], [])

  const getSeasonName = (seasonId: number | null) => {
    if (!seasonId) return '-'
    const season = seasons.find(s => s.id === seasonId)
    return season?.name || '-'
  }

  const columns: Column<TimelineEventUI>[] = useMemo(() => [
    {
      key: 'eventDate',
      header: '날짜',
      width: '180px',
      editable: true,
      editType: 'date',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
          <span>{formatDate(item.eventDate)}</span>
          {isFutureDate(item.eventDate) && (
            <span className={styles.upcomingBadge}>예정</span>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: '제목',
      editable: true,
      editType: 'text',
    },
    {
      key: 'category',
      header: '카테고리',
      width: '120px',
      editable: true,
      editType: 'select',
      selectOptions: categoryOptions,
      render: (item) => item.category ? (
        <span
          className={styles.badge}
          style={{
            background: `${categoryColors[item.category]}20`,
            color: categoryColors[item.category],
          }}
        >
          {categoryLabels[item.category]}
        </span>
      ) : '-',
    },
    {
      key: 'seasonId',
      header: '시즌',
      width: '180px',
      editable: true,
      editType: 'select',
      selectOptions: seasonOptions,
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{getSeasonName(item.seasonId)}</span>,
    },
    {
      key: 'imageUrl',
      header: '이미지',
      width: '80px',
      render: (item) => item.imageUrl ? (
        <ImageIcon size={16} style={{ color: 'var(--primary)' }} />
      ) : (
        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [seasonOptions, categoryOptions])

  return columns
}
