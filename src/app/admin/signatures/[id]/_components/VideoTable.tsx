import Image from 'next/image'
import { User, ExternalLink, Eye, EyeOff, Play } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import type { SignatureVideoWithMember } from './types'

interface VideoTableProps {
  videos: SignatureVideoWithMember[]
  isLoading: boolean
  onEdit: (video: SignatureVideoWithMember) => void
  onDelete: (video: SignatureVideoWithMember) => void
  onTogglePublished: (video: SignatureVideoWithMember) => void
  onPreview: (video: SignatureVideoWithMember) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function VideoTable({
  videos,
  isLoading,
  onEdit,
  onDelete,
  onTogglePublished,
  onPreview,
}: VideoTableProps) {
  const columns: Column<SignatureVideoWithMember>[] = [
    {
      key: 'memberImageUrl',
      header: '',
      width: '60px',
      render: (item) => (
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--card-border)',
          }}
        >
          {item.memberImageUrl ? (
            <Image
              src={item.memberImageUrl}
              alt={item.memberName}
              width={40}
              height={40}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <User size={20} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      ),
    },
    {
      key: 'memberName',
      header: '멤버',
      width: '150px',
      render: (item) => (
        <span style={{ fontWeight: 600 }}>{item.memberName}</span>
      ),
    },
    {
      key: 'videoUrl',
      header: '영상 URL',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {item.cloudflareUid && (
            <span
              style={{
                padding: '2px 6px',
                background: '#f38020',
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.625rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              CF
            </span>
          )}
          <span
            style={{
              maxWidth: item.cloudflareUid ? '260px' : '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--text-tertiary)',
              fontSize: '0.8125rem',
            }}
          >
            {item.cloudflareUid ? `stream:${item.cloudflareUid.slice(0, 8)}...` : item.videoUrl}
          </span>
          <a
            href={item.cloudflareUid ? `https://iframe.videodelivery.net/${item.cloudflareUid}` : item.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--primary)', flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      ),
    },
    {
      key: 'isPublished',
      header: '공개',
      width: '80px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTogglePublished(item)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: item.isPublished ? 'var(--primary)' : 'transparent',
            border: item.isPublished ? 'none' : '1px solid var(--card-border)',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          title={item.isPublished ? '비공개로 전환' : '공개로 전환'}
        >
          {item.isPublished ? (
            <Eye size={16} style={{ color: 'white' }} />
          ) : (
            <EyeOff size={16} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </button>
      ),
    },
    {
      key: 'id',
      header: '미리보기',
      width: '100px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPreview(item)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Play size={12} />
          재생
        </button>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '120px',
      render: (item) => formatDate(item.createdAt),
    },
  ]

  return (
    <DataTable
      data={videos}
      columns={columns}
      onEdit={onEdit}
      onDelete={onDelete}
      searchPlaceholder="멤버 이름으로 검색..."
      isLoading={isLoading}
    />
  )
}
