import Image from 'next/image'
import { User, Link as LinkIcon } from 'lucide-react'
import type { Column } from '@/components/admin'
import type { OrgMember } from './types'

function MemberAvatar({ item }: { item: OrgMember }) {
  return (
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      overflow: 'hidden',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: item.isLive ? '2px solid var(--live-color)' : '1px solid var(--border)',
      boxShadow: item.isLive ? '0 0 8px var(--live-glow)' : 'none',
    }}>
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          width={40}
          height={40}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <User size={20} style={{ color: 'var(--text-tertiary)' }} />
      )}
    </div>
  )
}

function MemberName({ item }: { item: OrgMember }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {item.isLive && (
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--live-color)',
          boxShadow: '0 0 8px var(--live-glow)',
          animation: 'pulse 2s infinite',
        }} title="LIVE" />
      )}
      {item.name}
    </div>
  )
}

function PandaTvLink({ item }: { item: OrgMember }) {
  if (item.socialLinks?.pandatv) {
    return (
      <a
        href={`https://www.pandalive.co.kr/play/${item.socialLinks.pandatv}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
      >
        <LinkIcon size={14} />
        {item.socialLinks.pandatv}
      </a>
    )
  }
  return <span style={{ color: 'var(--text-tertiary)' }}>-</span>
}

export function getMemberColumns(): Column<OrgMember>[] {
  return [
    {
      key: 'positionOrder',
      header: '순서',
      width: '50px',
      sortable: false,
      render: (item) => item.positionOrder + 1,
    },
    {
      key: 'imageUrl',
      header: '사진',
      width: '60px',
      render: (item) => <MemberAvatar item={item} />,
    },
    {
      key: 'name',
      header: '이름',
      width: '120px',
      render: (item) => <MemberName item={item} />,
    },
    { key: 'role', header: '직책', width: '100px' },
    {
      key: 'socialLinks',
      header: 'PandaTV',
      render: (item) => <PandaTvLink item={item} />,
    },
  ]
}
