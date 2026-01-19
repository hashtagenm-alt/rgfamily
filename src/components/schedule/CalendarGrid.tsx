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
  '休': '#8b94a5',
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
      return `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 100%)`
    }
    return undefined
  }

  return (
    <div className="grid grid-cols-7 gap-0.5 bg-[var(--divider)]">
        {days.map((day, index) => {
          const isSelected = isSameDay(day.date, selectedDate)
          const hasEvents = day.events.length > 0
          const cellBackground = hasEvents ? getCellBackground(day) : undefined

          return (
            <motion.button
              key={index}
              onClick={() => onSelectDate(day.date)}
              className={`
                min-h-[140px] md:min-h-[130px] sm:min-h-[100px] flex flex-col p-3
                bg-[var(--card-bg)] border-none cursor-pointer relative text-left
                transition-all duration-200
                hover:bg-[var(--interactive-hover)]
                ${!day.isCurrentMonth ? 'opacity-40' : ''}
                ${day.isToday ? 'bg-[var(--interactive-active)]' : ''}
                ${isSelected ? 'bg-[var(--interactive-focus)] shadow-[inset_0_0_0_2px_var(--color-pink-border)]' : ''}
              `}
              style={hasEvents && !isSelected && !day.isToday ? { background: cellBackground } : undefined}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <span
                className={`
                  text-lg font-bold mb-2 inline-flex items-center justify-center
                  min-w-[38px] min-h-[38px] rounded-full text-[var(--text-primary)]
                  ${day.isToday ? 'bg-[var(--text-primary)] !text-[var(--background)] font-bold shadow-md' : ''}
                `}
              >
                {day.date.getDate()}
              </span>

              {/* Event Text List (Desktop) - 크기 및 시인성 개선 */}
              {day.events.length > 0 && (
                <div className="hidden md:flex flex-col gap-1.5 flex-1 overflow-hidden mt-1">
                  {day.events.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className="px-2.5 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis transition-all"
                      style={{
                        backgroundColor: `${getEventColor(event)}30`,
                        color: getEventColor(event),
                        textShadow: '0 0 1px rgba(0,0,0,0.1)',
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {day.events.length > 3 && (
                    <span className="text-sm text-[var(--text-secondary)] font-semibold pl-1">
                      +{day.events.length - 3}개 더보기
                    </span>
                  )}
                </div>
              )}

              {/* Event Dots (Mobile) - 크기 확대 */}
              {day.events.length > 0 && (
                <div className="flex md:hidden gap-2 flex-wrap mt-auto">
                  {day.events.slice(0, 4).map((event, eventIndex) => (
                    <span
                      key={eventIndex}
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: getEventColor(event),
                        boxShadow: `0 0 6px ${getEventColor(event)}60`,
                      }}
                    />
                  ))}
                  {day.events.length > 4 && (
                    <span className="text-sm text-[var(--text-secondary)] font-bold">
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
