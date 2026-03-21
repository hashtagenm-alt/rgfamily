'use client'

import { motion } from 'framer-motion'
import { X, Play, Cloud, Loader2 } from 'lucide-react'
import { Media, formatDuration } from './types'

interface VodPartsPanelProps {
  expandedVodId: number | null
  vodParts: Media[]
  loadingParts: boolean
  onClose: () => void
  onPreview: (media: Media) => void
}

export default function VodPartsPanel({
  expandedVodId,
  vodParts,
  loadingParts,
  onClose,
  onPreview,
}: VodPartsPanelProps) {
  if (!expandedVodId) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '-8px',
        marginBottom: '16px',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
          파트 목록
          {vodParts.length > 0 && (
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '8px' }}>
              {vodParts.filter(p => p.cloudflareUid).length}/{vodParts[0]?.totalParts || vodParts.length}개 업로드됨
            </span>
          )}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            padding: '4px',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {loadingParts ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', padding: '12px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          파트 목록 로딩 중...
        </div>
      ) : vodParts.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', margin: 0 }}>파트 정보 없음</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {vodParts.map((part) => (
            <div
              key={part.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: 'var(--surface)',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              <span style={{
                fontWeight: 600,
                color: 'var(--primary)',
                minWidth: '50px',
              }}>
                Part {part.partNumber}
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {part.title}
              </span>
              {part.cloudflareUid ? (
                <span title="Cloudflare Stream"><Cloud size={14} style={{ color: '#f6821f', flexShrink: 0 }} /></span>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--color-warning)', flexShrink: 0 }}>미업로드</span>
              )}
              <span style={{ color: 'var(--text-tertiary)', minWidth: '60px', textAlign: 'right' }}>
                {formatDuration(part.duration)}
              </span>
              {part.cloudflareUid && (
                <button
                  onClick={() => onPreview(part)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '2px 8px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Play size={10} />
                  재생
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
