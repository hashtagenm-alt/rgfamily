'use client'

import { motion } from 'framer-motion'
import { X, Clock, MapPin, Calendar, Radio, Users, Megaphone, Sparkles, Pencil } from 'lucide-react'
import type { ScheduleEvent } from '@/types/common'
import styles from './EventDetailModal.module.css'

interface EventDetailModalProps {
  date: Date
  events: ScheduleEvent[]
  onClose: () => void
  isAdmin?: boolean
  onEditEvent?: (eventId: string) => void
}

const EVENT_ICONS: Record<string, typeof Radio> = {
  broadcast: Radio,
  collab: Users,
  event: Sparkles,
  notice: Megaphone,
  '休': Calendar,
}

const EVENT_LABELS: Record<string, string> = {
  broadcast: '방송',
  collab: '콜라보',
  event: '이벤트',
  notice: '공지',
  '休': '휴방',
}

export default function EventDetailModal({
  date,
  events,
  onClose,
  isAdmin = false,
  onEditEvent,
}: EventDetailModalProps) {
  const formattedDate = date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 설명 텍스트를 줄바꿈 기준으로 파싱
  const parseDescription = (desc: string) => {
    if (!desc) return []
    return desc.split('\n').filter(line => line.trim())
  }

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.dateInfo}>
            <Calendar size={18} />
            <span className={styles.dateText}>{formattedDate}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {events.length === 0 ? (
            <div className={styles.emptyState}>
              <Calendar size={32} strokeWidth={1.5} />
              <p>등록된 일정이 없습니다</p>
            </div>
          ) : (
            <div className={styles.eventList}>
              {events.map((event) => {
                const Icon = EVENT_ICONS[event.eventType] || Calendar
                const color = event.color || '#71717a'
                const descLines = parseDescription(event.description || '')

                return (
                  <div
                    key={event.id}
                    className={styles.eventCard}
                    style={{ '--event-color': color } as React.CSSProperties}
                  >
                    {/* Event Header */}
                    <div className={styles.eventHeader}>
                      <div className={styles.eventIcon} style={{ backgroundColor: color }}>
                        <Icon size={16} />
                      </div>
                      <div className={styles.eventMeta}>
                        <span className={styles.eventType} style={{ color }}>
                          {EVENT_LABELS[event.eventType]}
                        </span>
                        {event.unit && (
                          <span className={styles.eventUnit}>
                            {event.unit === 'excel' ? '엑셀부' : '크루부'}
                          </span>
                        )}
                      </div>
                      {/* Admin Edit Button */}
                      {isAdmin && onEditEvent && (
                        <button
                          className={styles.editBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditEvent(String(event.id))
                          }}
                          title="수정"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>

                    {/* Event Title */}
                    <h3 className={styles.eventTitle}>{event.title}</h3>

                    {/* Event Description */}
                    {descLines.length > 0 && (
                      <div className={styles.eventDesc}>
                        {descLines.map((line, idx) => (
                          <p key={idx} className={styles.descLine}>
                            {line.startsWith('•') || line.startsWith('-') || line.startsWith('※')
                              ? line
                              : `• ${line}`}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Event Footer */}
                    <div className={styles.eventFooter}>
                      {event.isAllDay ? (
                        <div className={styles.timeInfo}>
                          <Clock size={14} />
                          <span>하루 종일</span>
                        </div>
                      ) : (
                        <div className={styles.timeInfo}>
                          <Clock size={14} />
                          <span>
                            {formatTime(event.startDatetime)}
                            {event.endDatetime && ` ~ ${formatTime(event.endDatetime)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
