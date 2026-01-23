'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSchedule } from '@/lib/hooks/useSchedule'
import { useAuthContext } from '@/lib/context/AuthContext'
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
import AdminScheduleOverlay from './AdminScheduleOverlay'
import ScheduleEditModal from './ScheduleEditModal'
import type { Schedule } from '@/types/database'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar() {
  const {
    events,
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
    refetch,
  } = useSchedule()

  const { isAdmin } = useAuthContext()

  // 관리자 편집 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Schedule | null>(null)

  // 이벤트 편집 (EventDetailModal에서 호출)
  const handleEditEvent = (eventId: string) => {
    const event = events.find((e) => e.id === Number(eventId))
    if (event) {
      setEditingEvent(event)
      setIsEditModalOpen(true)
    }
  }

  // 편집 모달 콜백
  const handleEditModalClose = () => {
    setIsEditModalOpen(false)
    setEditingEvent(null)
  }

  const handleEventSaved = () => {
    setIsEditModalOpen(false)
    setEditingEvent(null)
    refetch()
  }

  const handleEventDeleted = () => {
    setIsEditModalOpen(false)
    setEditingEvent(null)
    setSelectedDate(null)  // 모달 닫기
    refetch()
  }

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
            className="border border-(--card-border)] bg-(--surface)] text-(--text-muted)] hover:bg-(--surface-hover)] hover:text-(--text-primary)] hover:border-(--card-border-hover)] transition-all"
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
              className="min-w-[200px] text-center text-(--text-primary)] tracking-wide text-2xl"
            >
              {monthYear}
            </Text>
          </motion.div>

          <ActionIcon
            onClick={nextMonth}
            variant="subtle"
            size="xl"
            radius="xl"
            className="border border-(--card-border)] bg-(--surface)] text-(--text-muted)] hover:bg-(--surface-hover)] hover:text-(--text-primary)] hover:border-(--card-border-hover)] transition-all"
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
              root: 'bg-(--surface)] border border-(--card-border)]',
              indicator: 'bg-(--text-primary)]',
              label: 'text-(--text-muted)] data-[active]:text-(--background)] font-semibold',
            }}
          />
        </Group>
      </Stack>

      {/* Calendar Container (Weekdays + Grid) */}
      <div className="rounded-2xl overflow-hidden border border-(--card-border)] bg-(--card-bg)] shadow-sm">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-0.5 bg-(--divider)]">
          {WEEKDAYS.map((day, index) => (
            <div
              key={day}
              className={`py-4 px-3 text-center text-sm font-semibold uppercase tracking-wider bg-(--surface)] ${
                index === 0 ? 'text-[#ef4444]' : index === 6 ? 'text-(--text-secondary)]' : 'text-(--text-primary)]'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="bg-(--card-bg)] p-12">
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
            isAdmin={isAdmin()}
            onEditEvent={handleEditEvent}
          />
        )}
      </AnimatePresence>

      {/* Admin Floating Add Button */}
      <AdminScheduleOverlay
        selectedDate={selectedDate}
        onEventCreated={refetch}
        onEventUpdated={refetch}
        onEventDeleted={refetch}
      />

      {/* Admin Edit Modal (from EventDetailModal) */}
      <ScheduleEditModal
        isOpen={isEditModalOpen}
        event={editingEvent}
        defaultDate={selectedDate}
        onClose={handleEditModalClose}
        onSaved={handleEventSaved}
        onDeleted={handleEventDeleted}
      />
      </Stack>
    </div>
  )
}
