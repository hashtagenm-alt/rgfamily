'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, X, Loader2 } from 'lucide-react'
import { createTimelineEvent } from '@/lib/actions/timeline'
import { useAlert } from '@/lib/hooks'

interface QuickAddFormProps {
  isOpen: boolean
  onClose: () => void
  onEventAdded: () => void
}

export function QuickAddForm({ isOpen, onClose, onEventAdded }: QuickAddFormProps) {
  const alertHandler = useAlert()
  const [quickAddData, setQuickAddData] = useState({
    title: '',
    eventDate: new Date().toISOString().split('T')[0],
  })
  const [isQuickAdding, setIsQuickAdding] = useState(false)

  const handleQuickAdd = useCallback(async () => {
    if (!quickAddData.title.trim()) {
      alertHandler.showWarning('제목을 입력해주세요.', '입력 오류')
      return
    }

    setIsQuickAdding(true)
    try {
      const result = await createTimelineEvent({
        event_date: quickAddData.eventDate,
        title: quickAddData.title.trim(),
        description: null,
        image_url: null,
        category: 'event',
        season_id: null,
      })

      if (result.error) {
        alertHandler.showError('추가에 실패했습니다.', '오류')
        return
      }

      alertHandler.showSuccess(`"${quickAddData.title}" 추가됨`)
      onEventAdded()

      // 폼 초기화 (연속 추가 가능)
      setQuickAddData({ title: '', eventDate: quickAddData.eventDate })
    } finally {
      setIsQuickAdding(false)
    }
  }, [quickAddData, alertHandler, onEventAdded])

  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleQuickAdd()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            background: 'var(--card-bg)',
            border: '2px dashed var(--primary)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={16} style={{ color: 'var(--primary)' }} />
              <input
                type="date"
                value={quickAddData.eventDate}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, eventDate: e.target.value }))}
                onKeyDown={handleQuickAddKeyDown}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <input
              type="text"
              value={quickAddData.title}
              onChange={(e) => setQuickAddData(prev => ({ ...prev, title: e.target.value }))}
              onKeyDown={handleQuickAddKeyDown}
              placeholder="이벤트 제목 입력 후 Enter..."
              autoFocus
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid var(--card-border)',
                borderRadius: '4px',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            />
            <button
              onClick={handleQuickAdd}
              disabled={isQuickAdding || !quickAddData.title.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                opacity: isQuickAdding || !quickAddData.title.trim() ? 0.6 : 1,
              }}
            >
              {isQuickAdding ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
              추가
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px',
                background: 'transparent',
                border: '1px solid var(--card-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={16} />
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Enter: 추가 · Escape: 닫기 · 연속 추가 가능
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
