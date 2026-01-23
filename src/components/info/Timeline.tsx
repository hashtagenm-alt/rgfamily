'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Calendar, Sparkles, ChevronRight, Loader2 } from 'lucide-react'
import { useTimelineData, getSeasonColor } from '@/lib/hooks/useTimelineData'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { formatDate } from '@/lib/utils/format'
import TimelineFilter from './TimelineFilter'
import TimelineEventCard from './TimelineEventCard'
import TimelineModal from './TimelineModal'
import AdminTimelineOverlay, { useAdminTimelineEdit } from '@/components/timeline/AdminTimelineOverlay'
import TimelineEditModal from '@/components/timeline/TimelineEditModal'
import type { TimelineItem } from '@/types/common'
import type { TimelineEvent } from '@/types/database'
import styles from './Timeline.module.css'

export default function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedEvent, setSelectedEvent] = useState<TimelineItem | null>(null)

  const {
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
    refetch,
    setSelectedSeasonId,
    setSelectedCategory,
    setSelectedTimeFilter,
  } = useTimelineData({ infiniteScroll: true, pageSize: 8 })

  // 관리자 편집 기능
  const adminEdit = useAdminTimelineEdit(refetch)

  // 무한 스크롤
  const { sentinelRef, setCanLoadMore } = useInfiniteScroll(loadMore, {
    enabled: hasMore && !isLoadingMore,
  })

  // hasMore 변경 시 canLoadMore 동기화
  useEffect(() => {
    if (!hasMore) {
      setCanLoadMore(false)
    }
  }, [hasMore, setCanLoadMore])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  const totalEvents = groupedBySeason.reduce((sum, g) => sum + g.events.length, 0)

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Filters */}
      <TimelineFilter
        seasons={seasons}
        categories={categories}
        selectedSeasonId={selectedSeasonId}
        selectedCategory={selectedCategory}
        selectedTimeFilter={selectedTimeFilter}
        onSeasonChange={setSelectedSeasonId}
        onCategoryChange={setSelectedCategory}
        onTimeFilterChange={setSelectedTimeFilter}
      />

      {/* Timeline */}
      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>타임라인을 불러오는 중...</span>
        </div>
      ) : totalEvents === 0 ? (
        <div className={styles.empty}>
          <Calendar size={48} strokeWidth={1} />
          <p>등록된 타임라인이 없습니다</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {/* Progress Line */}
          <div className={styles.line}>
            <motion.div className={styles.lineProgress} style={{ height: lineHeight }} />
          </div>

          {/* Grouped Events by Season */}
          {groupedBySeason.map((group, groupIndex) => {
            const seasonColor = getSeasonColor(groupIndex)
            let eventCounter = 0

            return (
              <div key={group.season?.id || 'no-season'} className={styles.seasonGroup}>
                {/* Season Header Card */}
                {group.season && (
                  <motion.div
                    className={styles.seasonHeader}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{ '--season-color': seasonColor } as React.CSSProperties}
                  >
                    <div className={styles.seasonIcon}>
                      <Sparkles size={24} />
                    </div>
                    <div className={styles.seasonInfo}>
                      <h2 className={styles.seasonName}>{group.season.name}</h2>
                      <p className={styles.seasonPeriod}>
                        {formatDate(group.season.start_date)}
                        {group.season.end_date && (
                          <>
                            <ChevronRight size={14} />
                            {formatDate(group.season.end_date)}
                          </>
                        )}
                      </p>
                    </div>
                    <div className={styles.seasonEventCount}>
                      <span className={styles.eventNumber}>{group.events.length}</span>
                      <span className={styles.eventLabel}>이벤트</span>
                    </div>
                  </motion.div>
                )}

                {/* Season Events */}
                {group.events.map((event) => {
                  const index = eventCounter++
                  return (
                    <TimelineEventCard
                      key={event.id}
                      event={event}
                      index={index}
                      onSelect={setSelectedEvent}
                      onDoubleClick={(e) => {
                        // TimelineItem을 TimelineEvent로 변환하여 편집 모달 열기
                        if (adminEdit.isAdmin) {
                          const timelineEvent: TimelineEvent = {
                            id: e.id,
                            title: e.title,
                            event_date: e.eventDate,
                            description: e.description || null,
                            image_url: e.imageUrl || null,
                            category: e.category || null,
                            season_id: e.seasonId || null,
                            order_index: 0,
                            created_at: '',
                          }
                          adminEdit.openEditModal(timelineEvent)
                        }
                      }}
                    />
                  )
                })}
              </div>
            )
          })}

          {/* Infinite Scroll Sentinel & Loading */}
          {hasMore && (
            <div ref={sentinelRef} className={styles.loadMoreSentinel}>
              {isLoadingMore && (
                <motion.div
                  className={styles.loadingMore}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 size={24} className={styles.spinnerIcon} />
                  <span>더 불러오는 중...</span>
                </motion.div>
              )}
            </div>
          )}

          {/* End of Timeline */}
          {!hasMore && totalEvents > 0 && (
            <motion.div
              className={styles.timelineEnd}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <span className={styles.endDot} />
              <span className={styles.endText}>모든 타임라인을 확인했습니다</span>
            </motion.div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <TimelineModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      {/* Admin: Timeline Event Edit Modal */}
      <TimelineEditModal
        isOpen={adminEdit.isModalOpen}
        event={adminEdit.editingEvent}
        onClose={adminEdit.closeModal}
        onSaved={adminEdit.handleSaved}
        onDeleted={adminEdit.handleDeleted}
      />

      {/* Admin: Floating Add Button */}
      <AdminTimelineOverlay onEventsChanged={refetch} />
    </div>
  )
}
