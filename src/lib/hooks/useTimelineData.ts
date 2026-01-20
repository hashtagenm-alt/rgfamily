'use client'

/**
 * useTimelineData Hook - Repository 패턴 적용
 *
 * 타임라인 데이터 조회 훅
 * - Mock/Supabase 자동 전환 (Repository 계층에서 처리)
 * - 시즌별/카테고리별 필터링
 * - 시즌별 그룹화 기능
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTimeline, useSeasons } from '@/lib/context'
import type { TimelineItem } from '@/types/common'
import type { Season } from '@/types/database'

export interface GroupedEvents {
  season: Season | null
  events: TimelineItem[]
}

export const CATEGORY_LABELS: Record<string, string> = {
  founding: '창단',
  milestone: '마일스톤',
  event: '이벤트',
  member: '멤버',
}

export const CATEGORY_COLORS: Record<string, string> = {
  founding: '#71717a',
  milestone: '#6b7280',
  event: '#52525b',
  member: '#8b8b8b',
}

export const SEASON_COLORS = ['#71717a', '#52525b', '#6b7280', '#8b8b8b', '#3f3f46']

// 시간 필터 타입
export type TimeFilter = 'all' | 'past' | 'upcoming'

export const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  all: '전체',
  past: '과거',
  upcoming: '예정',
}

export const getCategoryColor = (category: string | null): string => {
  return CATEGORY_COLORS[category || ''] || '#71717a'
}

export const getSeasonColor = (seasonIndex: number): string => {
  return SEASON_COLORS[seasonIndex % SEASON_COLORS.length]
}

export interface UseTimelineDataOptions {
  initialSeasonId?: number | null
  initialCategory?: string | null
  initialTimeFilter?: TimeFilter
  /** 페이지당 이벤트 수 (무한 스크롤용) */
  pageSize?: number
  /** 무한 스크롤 모드 활성화 */
  infiniteScroll?: boolean
}

export interface UseTimelineDataReturn {
  events: TimelineItem[]
  seasons: Season[]
  categories: string[]
  selectedSeasonId: number | null
  selectedCategory: string | null
  selectedTimeFilter: TimeFilter
  groupedBySeason: GroupedEvents[]
  isLoading: boolean
  /** 추가 로딩 중 여부 (무한 스크롤) */
  isLoadingMore: boolean
  /** 더 로드할 데이터 있는지 */
  hasMore: boolean
  /** 다음 페이지 로드 (무한 스크롤) */
  loadMore: () => Promise<void>
  setSelectedSeasonId: (id: number | null) => void
  setSelectedCategory: (category: string | null) => void
  setSelectedTimeFilter: (filter: TimeFilter) => void
  refetch: () => Promise<void>
}

export function useTimelineData(options?: UseTimelineDataOptions): UseTimelineDataReturn {
  const { pageSize = 10, infiniteScroll = false } = options || {}

  // Repository hooks
  const timelineRepo = useTimeline()
  const seasonsRepo = useSeasons()

  // State
  const [events, setEvents] = useState<TimelineItem[]>([])
  const [allFilteredEvents, setAllFilteredEvents] = useState<TimelineItem[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(
    options?.initialSeasonId ?? null
  )
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    options?.initialCategory ?? null
  )
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>(
    options?.initialTimeFilter ?? 'all'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // 시즌별로 이벤트 그룹화
  const groupedBySeason = useMemo((): GroupedEvents[] => {
    const groups: GroupedEvents[] = []
    const seasonMap = new Map<number, TimelineItem[]>()

    events.forEach((event) => {
      const seasonId = event.seasonId || 0
      if (!seasonMap.has(seasonId)) {
        seasonMap.set(seasonId, [])
      }
      seasonMap.get(seasonId)!.push(event)
    })

    // 시즌 ID 오름차순으로 정렬 (오래된 시즌 먼저, 최신 시즌이 스크롤 아래로)
    const sortedSeasonIds = Array.from(seasonMap.keys()).sort((a, b) => a - b)

    sortedSeasonIds.forEach((seasonId) => {
      const season = seasons.find((s) => s.id === seasonId) || null
      const seasonEvents = seasonMap.get(seasonId) || []

      // 각 시즌 내 이벤트도 날짜 오름차순 정렬 (오래된 이벤트 먼저)
      seasonEvents.sort((a, b) =>
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      )

      groups.push({ season, events: seasonEvents })
    })

    return groups
  }, [events, seasons])

  // 더 로드할 데이터가 있는지
  const hasMore = useMemo(() => {
    if (!infiniteScroll) return false
    return events.length < allFilteredEvents.length
  }, [infiniteScroll, events.length, allFilteredEvents.length])

  // 다음 페이지 로드 (무한 스크롤)
  const loadMore = useCallback(async () => {
    if (!infiniteScroll || isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    // 클라이언트 사이드 페이지네이션 (이미 로드된 데이터에서 slice)
    const nextPage = currentPage + 1
    const endIndex = nextPage * pageSize
    const nextEvents = allFilteredEvents.slice(0, endIndex)

    // 약간의 딜레이로 UX 개선
    await new Promise((resolve) => setTimeout(resolve, 300))

    setEvents(nextEvents)
    setCurrentPage(nextPage)
    setIsLoadingMore(false)
  }, [infiniteScroll, isLoadingMore, hasMore, currentPage, pageSize, allFilteredEvents])

  // 데이터 로드
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setCurrentPage(1)

    try {
      // 시즌 및 카테고리 목록 로드
      const [allSeasons, allCategories] = await Promise.all([
        seasonsRepo.findAll(),
        timelineRepo.getCategories(),
      ])

      setSeasons(allSeasons)
      setCategories(allCategories)

      // 필터링된 이벤트 로드
      const filteredEvents = await timelineRepo.findByFilter({
        seasonId: selectedSeasonId,
        category: selectedCategory,
      })

      // 시간 필터 적용
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const timeFilteredEvents = filteredEvents.filter((event) => {
        if (selectedTimeFilter === 'all') return true
        const eventDate = new Date(event.eventDate)
        if (selectedTimeFilter === 'past') return eventDate < today
        if (selectedTimeFilter === 'upcoming') return eventDate >= today
        return true
      })

      setAllFilteredEvents(timeFilteredEvents)

      // 무한 스크롤 모드면 첫 페이지만, 아니면 전체
      if (infiniteScroll) {
        setEvents(filteredEvents.slice(0, pageSize))
      } else {
        setEvents(filteredEvents)
      }
    } catch (err) {
      console.error('타임라인 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }, [timelineRepo, seasonsRepo, selectedSeasonId, selectedCategory, selectedTimeFilter, infiniteScroll, pageSize])

  // 초기 로드 및 필터 변경 시 refetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    events,
    seasons,
    categories,
    selectedSeasonId,
    selectedCategory,
    selectedTimeFilter,
    groupedBySeason,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    setSelectedSeasonId,
    setSelectedCategory,
    setSelectedTimeFilter,
    refetch: fetchData,
  }
}
