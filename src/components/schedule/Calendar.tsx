'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSchedule } from '@/lib/hooks/useSchedule'
import {
  Group,
  Stack,
  Text,
  ActionIcon,
  SegmentedControl,
  Loader,
} from '@mantine/core'
import CalendarGrid from './CalendarGrid'
import EventDetailModal from './EventDetailModal'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar() {
  const {
    currentMonth,
    selectedDate,
    unitFilter,
    isLoading,
    calendarDays,
    selectedDateEvents,
    setSelectedDate,
    setUnitFilter,
    nextMonth,
    prevMonth,
  } = useSchedule()

  const monthYear = currentMonth.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="w-full flex justify-center px-4 md:px-8 pb-16">
      <Stack gap="lg" className="w-full max-w-[1100px]">
        {/* Header */}
        <Stack gap="md">
        {/* Month Navigation - Centered */}
        <Group gap="lg" align="center" justify="center">
          <ActionIcon
            onClick={prevMonth}
            variant="subtle"
            size="xl"
            radius="xl"
            className="border border-[var(--card-border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)] transition-all"
          >
            <ChevronLeft size={24} />
          </ActionIcon>

          <motion.div
            key={monthYear}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Text
              size="xl"
              fw={800}
              className="min-w-[200px] text-center text-[var(--text-primary)] tracking-wide text-2xl"
            >
              {monthYear}
            </Text>
          </motion.div>

          <ActionIcon
            onClick={nextMonth}
            variant="subtle"
            size="xl"
            radius="xl"
            className="border border-[var(--card-border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)] transition-all"
          >
            <ChevronRight size={24} />
          </ActionIcon>
        </Group>

        {/* Filters - Right aligned */}
        <Group justify="flex-end">
          <SegmentedControl
            value={unitFilter}
            onChange={(value) => setUnitFilter(value as 'all' | 'excel' | 'crew')}
            data={[
              { label: '전체', value: 'all' },
              { label: '엑셀부', value: 'excel' },
              { label: '크루부', value: 'crew' },
            ]}
            radius="xl"
            size="sm"
            classNames={{
              root: 'bg-[var(--surface)] border border-[var(--card-border)]',
              indicator: 'bg-[var(--text-primary)]',
              label: 'text-[var(--text-muted)] data-[active]:text-[var(--background)] font-semibold',
            }}
          />
        </Group>
      </Stack>

      {/* Calendar Container (Weekdays + Grid) */}
      <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-0.5 bg-[var(--divider)]">
          {WEEKDAYS.map((day, index) => (
            <div
              key={day}
              className={`py-4 px-3 text-center text-sm font-semibold uppercase tracking-wider bg-[var(--surface)] ${
                index === 0 ? 'text-[#ef4444]' : index === 6 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="bg-[var(--card-bg)] p-12">
            <Stack align="center" justify="center" gap="lg">
              <Loader color="gray" size="lg" />
              <Text c="dimmed">일정을 불러오는 중...</Text>
            </Stack>
          </div>
        ) : (
          <CalendarGrid
            days={calendarDays}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        )}
      </div>

      {/* Selected Date Events Modal */}
      <AnimatePresence>
        {selectedDate && (
          <EventDetailModal
            date={selectedDate}
            events={selectedDateEvents}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </AnimatePresence>
      </Stack>
    </div>
  )
}
