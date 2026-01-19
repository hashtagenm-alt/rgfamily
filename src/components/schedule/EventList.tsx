'use client'

import { motion } from 'framer-motion'
import { X, Clock, Radio, Users, Megaphone, Calendar } from 'lucide-react'
import type { ScheduleEvent } from '@/types/common'
import {
  Paper,
  Group,
  Stack,
  Text,
  ActionIcon,
  Badge,
  ThemeIcon,
} from '@mantine/core'

interface EventListProps {
  date: Date
  events: ScheduleEvent[]
  onClose: () => void
}

const EVENT_ICONS = {
  broadcast: Radio,
  collab: Users,
  event: Calendar,
  notice: Megaphone,
  '休': Calendar,
}

const EVENT_LABELS = {
  broadcast: '방송',
  collab: '콜라보',
  event: '이벤트',
  notice: '공지',
  '休': '휴방',
}

const EVENT_COLORS: Record<string, string> = {
  broadcast: '#7fb28a',
  collab: '#7aa2d8',
  event: '#d1a36c',
  notice: '#c2a77a',
  '休': '#94a3b8',
}

export default function EventList({ date, events, onClose }: EventListProps) {
  const formattedDate = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Paper
      p="lg"
      radius="lg"
      className="bg-[var(--card-bg)] border border-[var(--glass-border)] backdrop-blur-lg"
    >
      <Group justify="space-between" align="center" mb="lg" pb="md" className="border-b border-[var(--glass-border)]">
        <Text size="lg" fw={700} className="text-[var(--text-primary)]">
          {formattedDate}
        </Text>
        <ActionIcon
          onClick={onClose}
          variant="subtle"
          size="lg"
          radius="xl"
          className="bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all"
        >
          <X size={20} />
        </ActionIcon>
      </Group>

      {events.length === 0 ? (
        <Stack align="center" justify="center" py="xl" gap="md">
          <Calendar size={48} strokeWidth={1} className="text-[var(--text-muted)]" />
          <Text c="dimmed">등록된 일정이 없습니다</Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {events.map((event, index) => {
            const Icon = EVENT_ICONS[event.eventType]
            const color = event.color || EVENT_COLORS[event.eventType] || '#94a3b8'

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-4 p-5 bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl transition-all hover:bg-[var(--surface)] hover:translate-x-1"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <ThemeIcon
                  size={40}
                  radius="md"
                  style={{ backgroundColor: color }}
                  className="flex-shrink-0"
                >
                  <Icon size={16} />
                </ThemeIcon>

                <div className="flex-1 min-w-0">
                  <Group gap="xs" mb="xs">
                    <Badge
                      size="sm"
                      variant="light"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      {EVENT_LABELS[event.eventType]}
                    </Badge>
                    {event.unit && (
                      <Badge
                        size="sm"
                        variant="light"
                        className={
                          event.unit === 'crew'
                            ? 'bg-[var(--color-cyan-bg)] text-[var(--color-cyan)]'
                            : 'bg-[var(--overlay-medium)] text-[var(--text-secondary)]'
                        }
                      >
                        {event.unit === 'excel' ? '엑셀부' : '크루부'}
                      </Badge>
                    )}
                  </Group>

                  <Text fw={600} className="text-[var(--text-primary)] mb-1">
                    {event.title}
                  </Text>

                  {event.description && (
                    <Text size="sm" c="dimmed" className="mb-2 leading-relaxed">
                      {event.description}
                    </Text>
                  )}

                  <Group gap="md">
                    {!event.isAllDay && (
                      <Group gap="xs" className="text-[var(--text-muted)]">
                        <Clock size={14} />
                        <Text size="sm">
                          {formatTime(event.startDatetime)}
                          {event.endDatetime && ` - ${formatTime(event.endDatetime)}`}
                        </Text>
                      </Group>
                    )}
                    {event.isAllDay && (
                      <Group gap="xs" className="text-[var(--text-muted)]">
                        <Clock size={14} />
                        <Text size="sm">하루 종일</Text>
                      </Group>
                    )}
                  </Group>
                </div>
              </motion.div>
            )
          })}
        </Stack>
      )}
    </Paper>
  )
}
