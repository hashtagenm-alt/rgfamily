'use client'

import Image from 'next/image'
import { ChevronDown, ChevronUp, Video, Upload, Loader2 } from 'lucide-react'
import type { Column } from '@/components/admin'
import type { SignatureUI } from './types'

interface UseSignatureColumnsOptions {
  expandedSigId: number | null
  uploadingId: number | null
  onToggleExpand: (item: SignatureUI) => void
  onThumbnailClick: (sigId: number, e: React.MouseEvent) => void
}

export function useSignatureColumns({
  expandedSigId,
  uploadingId,
  onToggleExpand,
  onThumbnailClick,
}: UseSignatureColumnsOptions): Column<SignatureUI>[] {
  return [
    {
      key: 'expand',
      header: '',
      width: '50px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(item)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: expandedSigId === item.id ? 'var(--primary)' : 'var(--surface)',
            border: `1px solid ${expandedSigId === item.id ? 'var(--primary)' : 'var(--card-border)'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            color: expandedSigId === item.id ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
          title={expandedSigId === item.id ? '영상 관리 닫기' : '영상 관리 열기'}
        >
          {expandedSigId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      ),
    },
    {
      key: 'sigNumber',
      header: '번호',
      width: '80px',
      editable: true,
      editType: 'number',
      render: (item) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
          #{item.sigNumber}
        </span>
      ),
    },
    {
      key: 'thumbnailUrl',
      header: '썸네일',
      width: '100px',
      render: (item) => (
        <div
          onClick={(e) => onThumbnailClick(item.id, e)}
          style={{
            width: '80px',
            height: '45px',
            borderRadius: '4px',
            overflow: 'hidden',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            border: '2px dashed transparent',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
          title="클릭하여 썸네일 변경"
        >
          {uploadingId === item.id ? (
            <Loader2 size={20} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          ) : item.thumbnailUrl ? (
            <>
              <Image
                src={item.thumbnailUrl}
                alt={item.title}
                width={80}
                height={45}
                style={{ objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                <Upload size={16} style={{ color: 'white' }} />
              </div>
            </>
          ) : (
            <Upload size={20} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: '제목',
      editable: true,
      editType: 'text',
      render: (item) => (
        <span>{item.title}</span>
      ),
    },
    {
      key: 'videoCount',
      header: '영상',
      width: '100px',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Video size={14} style={{ color: item.videoCount > 0 ? 'var(--primary)' : 'var(--text-muted)' }} />
          <span style={{ fontWeight: 600, color: item.videoCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {item.videoCount}개
          </span>
        </div>
      ),
    },
  ]
}
