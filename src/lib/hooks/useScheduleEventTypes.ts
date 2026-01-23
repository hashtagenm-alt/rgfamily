'use client'

/**
 * useScheduleEventTypes Hook
 *
 * schedule_event_types 테이블에서 일정 유형 데이터를 가져와 관리하는 훅
 * ScheduleEditModal.tsx의 하드코딩된 EVENT_TYPES 상수를 대체
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSupabaseContext } from '@/lib/context'

// DB에서 가져온 이벤트 타입
export interface ScheduleEventType {
  id: number
  code: string
  label: string
  color: string | null
  icon: string | null
  display_order: number
  is_active: boolean
}

interface UseScheduleEventTypesReturn {
  /** 전체 이벤트 타입 목록 (display_order 순) */
  eventTypes: ScheduleEventType[]
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 데이터 새로고침 */
  refresh: () => Promise<void>
  /** code로 이벤트 타입 조회 */
  getByCode: (code: string) => ScheduleEventType | null
  /** ID로 이벤트 타입 조회 */
  getById: (id: number) => ScheduleEventType | null
  /** code로 색상 조회 */
  getColor: (code: string) => string
  /** code로 라벨 조회 */
  getLabel: (code: string) => string
  /** code로 아이콘 조회 */
  getIcon: (code: string) => string | null
  /** 활성 타입만 필터 */
  activeTypes: ScheduleEventType[]
  /** 총 이벤트 타입 수 */
  totalTypes: number
}

export function useScheduleEventTypes(): UseScheduleEventTypesReturn {
  const supabase = useSupabaseContext()
  const [eventTypes, setEventTypes] = useState<ScheduleEventType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEventTypes = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('schedule_event_types')
        .select('*')
        .order('display_order', { ascending: true })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setEventTypes(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : '이벤트 타입을 불러오는데 실패했습니다'
      setError(message)
      console.error('schedule_event_types 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchEventTypes()
  }, [fetchEventTypes])

  // 유틸리티 함수들
  const getByCode = useCallback(
    (code: string): ScheduleEventType | null => {
      return eventTypes.find((t) => t.code === code) || null
    },
    [eventTypes]
  )

  const getById = useCallback(
    (id: number): ScheduleEventType | null => {
      return eventTypes.find((t) => t.id === id) || null
    },
    [eventTypes]
  )

  const getColor = useCallback(
    (code: string): string => {
      const type = getByCode(code)
      return type?.color || '#888888'
    },
    [getByCode]
  )

  const getLabel = useCallback(
    (code: string): string => {
      const type = getByCode(code)
      return type?.label || code
    },
    [getByCode]
  )

  const getIcon = useCallback(
    (code: string): string | null => {
      const type = getByCode(code)
      return type?.icon || null
    },
    [getByCode]
  )

  const activeTypes = useMemo(
    () => eventTypes.filter((t) => t.is_active),
    [eventTypes]
  )

  const totalTypes = useMemo(() => eventTypes.length, [eventTypes])

  return {
    eventTypes,
    isLoading,
    error,
    refresh: fetchEventTypes,
    getByCode,
    getById,
    getColor,
    getLabel,
    getIcon,
    activeTypes,
    totalTypes,
  }
}

export default useScheduleEventTypes
