'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Hash, Plus, X, Loader2 } from 'lucide-react'

interface SignatureQuickAddProps {
  isOpen: boolean
  sigNumber: number
  title: string
  isAdding: boolean
  onSigNumberChange: (num: number) => void
  onTitleChange: (title: string) => void
  onAdd: () => void
  onClose: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export default function SignatureQuickAdd({
  isOpen,
  sigNumber,
  title,
  isAdding,
  onSigNumberChange,
  onTitleChange,
  onAdd,
  onClose,
  onKeyDown,
}: SignatureQuickAddProps) {
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
              <Hash size={16} style={{ color: 'var(--primary)' }} />
              <input
                type="number"
                value={sigNumber}
                onChange={(e) => onSigNumberChange(parseInt(e.target.value) || 1)}
                onKeyDown={onKeyDown}
                min={1}
                style={{
                  width: '60px',
                  padding: '8px 12px',
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="시그 제목 입력 후 Enter..."
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
              onClick={onAdd}
              disabled={isAdding || !title.trim()}
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
                opacity: isAdding || !title.trim() ? 0.6 : 1,
              }}
            >
              {isAdding ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
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
