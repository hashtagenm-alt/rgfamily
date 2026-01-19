'use client'

import { motion } from 'framer-motion'
import type { CalendarDay } from '@/types/common'

interface CalendarGridProps {
  days: CalendarDay[]
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}

const EVENT_COLORS: Record<string, string> = {
  broadcast: '#7fb28a',
  collab: '#7aa2d8',
  event: '#d1a36c',
  notice: '#c2a77a',
  '休': '#94a3b8',
  excel: '#7fb28a',
  crew: '#7aa2d8',
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

  return (
    <div className="grid grid-cols-7 gap-0.5 bg-[var(--divider)]">
        {days.map((day, index) => {
          const isSelected = isSameDay(day.date, selectedDate)
          const dayOfWeek = day.date.getDay()
          const isSunday = dayOfWeek === 0
          const isSaturday = dayOfWeek === 6

          return (
            <motion.button
              key={index}
              onClick={() => onSelectDate(day.date)}
              className={`
                min-h-[130px] md:min-h-[110px] sm:min-h-[90px] flex flex-col p-3
                bg-[var(--card-bg)] border-none cursor-pointer relative text-left
                transition-all duration-200
                hover:bg-[var(--interactive-hover)]
                ${!day.isCurrentMonth ? 'opacity-50' : ''}
                ${day.isToday ? 'bg-[var(--interactive-active)]' : ''}
                ${isSelected ? 'bg-[var(--interactive-focus)] shadow-[inset_0_0_0_2px_var(--color-pink-border)]' : ''}
              `}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <span
                className={`
                  text-base font-bold mb-3 inline-flex items-center justify-center
                  min-w-[36px] min-h-[36px] rounded-full
                  ${isSunday ? 'text-red-500' : isSaturday ? 'text-blue-500' : 'text-[var(--text-primary)]'}
                  ${day.isToday ? 'bg-[var(--text-primary)] !text-[var(--background)] font-bold shadow-md' : ''}
                `}
              >
                {day.date.getDate()}
              </span>

              {/* Event Text List (Desktop) */}
              {day.events.length > 0 && (
                <div className="hidden md:flex flex-col gap-1 flex-1 overflow-hidden mt-1">
                  {day.events.slice(0, 2).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-all"
                      style={{
                        backgroundColor: `${getEventColor(event)}25`,
                        color: getEventColor(event),
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {day.events.length > 2 && (
                    <span className="text-xs text-[var(--text-muted)] font-medium">
                      +{day.events.length - 2}개
                    </span>
                  )}
                </div>
              )}

              {/* Event Dots (Mobile) */}
              {day.events.length > 0 && (
                <div className="flex md:hidden gap-2 flex-wrap mt-auto">
                  {day.events.slice(0, 4).map((event, eventIndex) => (
                    <span
                      key={eventIndex}
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: getEventColor(event),
                        boxShadow: `0 0 4px ${getEventColor(event)}60`,
                      }}
                    />
                  ))}
                  {day.events.length > 4 && (
                    <span className="text-xs text-[var(--text-secondary)] font-semibold">
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
