'use client'

import { motion } from 'framer-motion'
import type { CalendarDay } from '@/types/common'

interface CalendarGridProps {
  days: CalendarDay[]
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}

const EVENT_COLORS: Record<string, string> = {
  broadcast: '#7f9b88',
  collab: '#8a94a6',
  event: '#c89b6b',
  notice: '#b8a07a',
  休: '#8b94a5',
  excel: '#7f9b88',
  crew: '#8a94a6',
}

export default function CalendarGrid({ days, selectedDate, onSelectDate }: CalendarGridProps) {
  const isSameDay = (date1: Date, date2: Date | null) => {
    if (!date2) return false
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const getEventColor = (event: { color?: string | null; eventType?: string }) => {
    return event.color || EVENT_COLORS[event.eventType || ''] || '#6b7280'
  }

  // 셀 배경색 계산 (이벤트가 있으면 첫 번째 이벤트 색상 기반 은은한 배경)
  const getCellBackground = (day: CalendarDay) => {
    if (day.events.length > 0) {
      const primaryColor = getEventColor(day.events[0])
      return `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}12 100%)`
    }
    return undefined
  }

  return (
    <div className="grid grid-cols-7 gap-0.5 bg-(--divider)">
      {days.map((day, index) => {
        const isSelected = isSameDay(day.date, selectedDate)
        const hasEvents = day.events.length > 0
        const cellBackground = hasEvents ? getCellBackground(day) : undefined

        return (
          <motion.button
            key={index}
            onClick={() => onSelectDate(day.date)}
            className={`relative flex min-h-[80px] cursor-pointer flex-col border-none bg-(--card-bg) p-1.5 text-left transition-all duration-200 hover:bg-(--surface) sm:min-h-[100px] sm:p-2 md:min-h-[130px] md:p-3 ${!day.isCurrentMonth ? 'opacity-40' : ''} ${day.isToday ? 'bg-(--overlay-medium)' : ''} ${isSelected ? 'bg-(--surface) shadow-[inset_0_0_0_2px_var(--text-primary)]' : ''} `}
            style={
              hasEvents && !isSelected && !day.isToday ? { background: cellBackground } : undefined
            }
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
          >
            <div className="mb-2 flex w-full flex-col items-center gap-0.5">
              <span
                className={`inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-full text-sm font-bold sm:min-h-[38px] sm:min-w-[38px] sm:text-lg ${day.isToday ? 'bg-(--text-primary) font-bold text-(--background)! shadow-md' : ''} ${!day.isToday && day.isHoliday ? 'text-[#ef4444]' : 'text-(--text-primary)'} `}
              >
                {day.date.getDate()}
              </span>
              {day.holidayName && (
                <span className="max-w-full overflow-hidden px-1 text-center text-[10px] font-semibold text-ellipsis whitespace-nowrap text-[#ef4444]">
                  {day.holidayName}
                </span>
              )}
            </div>

            {/* Event Text List (Desktop) - 크기 및 시인성 개선 */}
            {day.events.length > 0 && (
              <div className="mt-1 hidden flex-1 flex-col gap-1.5 overflow-hidden md:flex">
                {day.events.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className="overflow-hidden rounded-md px-2 py-1 text-xs font-semibold text-ellipsis whitespace-nowrap transition-all"
                    style={{
                      backgroundColor: `${getEventColor(event)}18`,
                      border: `1px solid ${getEventColor(event)}30`,
                      color: getEventColor(event),
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {day.events.length > 3 && (
                  <span className="pl-1 text-sm font-semibold text-(--text-secondary)">
                    +{day.events.length - 3}개 더보기
                  </span>
                )}
              </div>
            )}

            {/* Event Dots (Mobile) - 크기 확대 */}
            {day.events.length > 0 && (
              <div className="mt-auto flex flex-wrap gap-2 md:hidden">
                {day.events.slice(0, 4).map((event, eventIndex) => (
                  <span
                    key={eventIndex}
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: getEventColor(event),
                    }}
                  />
                ))}
                {day.events.length > 4 && (
                  <span className="text-sm font-bold text-(--text-secondary)">
                    +{day.events.length - 4}
                  </span>
                )}
              </div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
