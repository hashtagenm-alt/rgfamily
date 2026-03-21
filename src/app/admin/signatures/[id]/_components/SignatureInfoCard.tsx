import Image from 'next/image'
import { Video, Image as ImageIcon } from 'lucide-react'
import styles from '../../../shared.module.css'
import type { SignatureInfo } from './types'

interface SignatureInfoCardProps {
  signature: SignatureInfo
  videoCount: number
}

export function SignatureInfoCard({ signature, videoCount }: SignatureInfoCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '1.5rem',
        padding: '1.5rem',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
      }}
    >
      <div
        style={{
          width: '160px',
          height: '90px',
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {signature.thumbnailUrl ? (
          <Image
            src={signature.thumbnailUrl}
            alt={signature.title}
            width={160}
            height={90}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <ImageIcon size={32} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
          }}
        >
          <span
            className={`${styles.badge} ${signature.unit === 'excel' ? styles.badgeExcel : styles.badgeCrew}`}
          >
            {signature.unit === 'excel' ? '엑셀부' : '크루부'}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
            #{signature.sigNumber}
          </span>
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {signature.title}
        </h2>
        {signature.description && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            {signature.description}
          </p>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-tertiary)',
        }}
      >
        <Video size={20} />
        <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>{videoCount}</span>
        <span style={{ fontSize: '0.875rem' }}>영상</span>
      </div>
    </div>
  )
}
