'use client'

/**
 * useSchedule Hook - Repository 패턴 적용
 *
 * 일정 캘린더 데이터 조회 훅
 * - Mock/Supabase 자동 전환 (Repository 계층에서 처리)
 * - 월별/유닛별 필터링
 * - 캘린더 UI 로직 포함
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSchedules } from '@/lib/context'
import { getMonthHolidays } from '@/lib/utils/holidays'
import type { Schedule } from '@/types/database'
import type { CalendarDay, ScheduleEvent, UnitFilter } from '@/types/common'

interface UseScheduleReturn {
  events: Schedule[]
  currentMonth: Date
  selectedDate: Date | null
  unitFilter: UnitFilter
  isLoading: boolean
  error: string | null
  calendarDays: CalendarDay[]
  selectedDateEvents: ScheduleEvent[]
  setMonth: (date: Date) => void
  setSelectedDate: (date: Date | null) => void
  setUnitFilter: (filter: UnitFilter) => void
  nextMonth: () => void
  prevMonth: () => void
  refetch: () => Promise<void>
}

export function useSchedule(): UseScheduleReturn {
  // Repository hook
  const schedulesRepo = useSchedules()

  // State
  const [events, setEvents] = useState<Schedule[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 데이터 로드
  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await schedulesRepo.findByMonthAndUnit(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        unitFilter === 'all' ? null : unitFilter
      )
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [schedulesRepo, currentMonth, unitFilter])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // 캘린더 날짜 계산
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // 공휴일 정보 가져오기
    const holidays = getMonthHolidays(year, month)
    const prevMonthHolidays = getMonthHolidays(
      month === 0 ? year - 1 : year,
      month === 0 ? 11 : month - 1
    )
    const nextMonthHolidays = getMonthHolidays(
      month === 11 ? year + 1 : year,
      month === 11 ? 0 : month + 1
    )

    const days: CalendarDay[] = []

    // 이전 달의 날짜들
    const startDayOfWeek = firstDay.getDay()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      const dayNum = date.getDate()
      const holidayName = prevMonthHolidays.get(dayNum) || null
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isHoliday: !!holidayName || date.getDay() === 0,
        holidayName,
        events: [],
      })
    }

    // 현재 달의 날짜들
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const holidayName = holidays.get(day) || null
      const dayEvents = events
        .filter((event) => {
          const eventDate = new Date(event.start_datetime)
          return (
            eventDate.getDate() === day &&
            eventDate.getMonth() === month &&
            eventDate.getFullYear() === year
          )
        })
        .map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          unit: event.unit,
          eventType: event.event_type,
          startDatetime: event.start_datetime,
          endDatetime: event.end_datetime,
          color: event.color,
          isAllDay: event.is_all_day,
        }))

      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isHoliday: !!holidayName || date.getDay() === 0,
        holidayName,
        events: dayEvents,
      })
    }

    // 다음 달의 날짜들 (6주 맞추기)
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      const holidayName = nextMonthHolidays.get(i) || null
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isHoliday: !!holidayName || date.getDay() === 0,
        holidayName,
        events: [],
      })
    }

    return days
  }, [currentMonth, events])

  // 선택된 날짜의 이벤트
  const selectedDateEvents = useMemo((): ScheduleEvent[] => {
    if (!selectedDate) return []

    return events
      .filter((event) => {
        const eventDate = new Date(event.start_datetime)
        return (
          eventDate.getDate() === selectedDate.getDate() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getFullYear() === selectedDate.getFullYear()
        )
      })
      .map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        unit: event.unit,
        eventType: event.event_type,
        startDatetime: event.start_datetime,
        endDatetime: event.end_datetime,
        color: event.color,
        isAllDay: event.is_all_day,
      }))
  }, [selectedDate, events])

  const nextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  const prevMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  return {
    events,
    currentMonth,
    selectedDate,
    unitFilter,
    isLoading,
    error,
    calendarDays,
    selectedDateEvents,
    setMonth: setCurrentMonth,
    setSelectedDate,
    setUnitFilter,
    nextMonth,
    prevMonth,
    refetch: fetchEvents,
  }
}
