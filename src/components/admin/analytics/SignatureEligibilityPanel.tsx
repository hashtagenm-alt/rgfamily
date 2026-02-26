'use client'

import { useState, useMemo } from 'react'
import {
  Loader2,
  Award,
  AlertTriangle,
  ChevronDown,
  Users,
  Trophy,
} from 'lucide-react'
import type { SignatureEligibilityData } from '@/lib/actions/analytics'
import styles from './SignatureEligibilityPanel.module.css'

interface SignatureEligibilityPanelProps {
  data: SignatureEligibilityData | null
  isLoading: boolean
}

const GRADE_CONFIG = [
  { key: 'sig3', emoji: '🥇', label: '3개 시그니처', color: '#ffd700', threshold: '10만 + 15만 + 20만' },
  { key: 'sig2', emoji: '🥈', label: '2개 시그니처', color: '#c0c0c0', threshold: '10만 + 15만' },
  { key: 'sig1', emoji: '🥉', label: '1개 시그니처', color: '#cd7f32', threshold: '10만' },
] as const

export function SignatureEligibilityPanel({ data, isLoading }: SignatureEligibilityPanelProps) {
  const [openEpisodes, setOpenEpisodes] = useState<Set<number>>(new Set())

  // DB 미반영 건 Set (빠른 lookup)
  const unsyncedSet = useMemo(() => {
    if (!data?.unsynced) return new Set<string>()
    return new Set(data.unsynced.map(u => `${u.donorName}|${u.sigNumber}`))
  }, [data])

  const toggleEpisode = (epNum: number) => {
    setOpenEpisodes(prev => {
      const next = new Set(prev)
      if (next.has(epNum)) next.delete(epNum)
      else next.add(epNum)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
        <span>시그니처 자격 분석 중...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={styles.empty}>
        <p>시그니처 자격 데이터가 없습니다.</p>
      </div>
    )
  }

  const { episodeBreakdown, summary, unsynced } = data

  return (
    <div className={styles.container}>
      {/* A. 종합 현황 카드 */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard} style={{ borderTopColor: '#fd68ba' }}>
          <div className={styles.summaryCardHeader}>
            <Users size={20} color="#fd68ba" />
            <span className={styles.summaryCardLabel}>총 대상자</span>
          </div>
          <span className={styles.summaryCardValue} style={{ color: '#fd68ba' }}>
            {summary.totalPeople}
          </span>
          <span className={styles.summaryCardSub}>명</span>
        </div>

        <div className={styles.summaryCard} style={{ borderTopColor: '#8b5cf6' }}>
          <div className={styles.summaryCardHeader}>
            <Trophy size={20} color="#8b5cf6" />
            <span className={styles.summaryCardLabel}>총 시그니처</span>
          </div>
          <span className={styles.summaryCardValue} style={{ color: '#8b5cf6' }}>
            {summary.totalSigs}
          </span>
          <span className={styles.summaryCardSub}>개</span>
        </div>

        <div className={styles.summaryCard} style={{ borderTopColor: unsynced.length > 0 ? '#f59e0b' : '#10b981' }}>
          <div className={styles.summaryCardHeader}>
            <Award size={20} color={unsynced.length > 0 ? '#f59e0b' : '#10b981'} />
            <span className={styles.summaryCardLabel}>DB 미반영</span>
          </div>
          <span className={styles.summaryCardValue} style={{ color: unsynced.length > 0 ? '#f59e0b' : '#10b981' }}>
            {unsynced.length}
          </span>
          <span className={styles.summaryCardSub}>건</span>
        </div>
      </div>

      {/* 등급별 카드 */}
      <div className={styles.gradeRow}>
        {GRADE_CONFIG.map(({ key, emoji, label, color, threshold }) => {
          const count = summary[key].length
          return (
            <div key={key} className={styles.gradeCard} style={{ borderTopColor: color }}>
              <div className={styles.gradeHeader} style={{ color }}>
                <span className={styles.gradeEmoji}>{emoji}</span>
                <span>{label}</span>
              </div>
              <div className={styles.gradeCount}>
                <span className={styles.gradeValue} style={{ color }}>{count}</span>
                <span className={styles.gradeUnit}>명</span>
              </div>
              <span className={styles.summaryCardSub}>{threshold}</span>
            </div>
          )
        })}
      </div>

      {/* 미반영 배너 */}
      {unsynced.length > 0 && (
        <div className={styles.unsyncedBanner}>
          <AlertTriangle size={18} />
          <span>
            DB 미반영 {unsynced.length}건 발견 — {' '}
            {unsynced.map(u => `${u.donorName}(${u.sigNumber}번째)`).join(', ')}
            {' '}→ <code>npx tsx scripts/manage-signature-eligibility.ts --sync</code> 로 동기화 필요
          </span>
        </div>
      )}

      {/* B. 회차별 달성자 아코디언 */}
      <div className={styles.episodeSection}>
        <h4 className={styles.sectionTitle}>회차별 달성자</h4>
        <p className={styles.sectionDesc}>
          에피소드별 10만+ 하트 달성자 목록 (✅ 확정 / ⏳ 미확정)
        </p>

        {episodeBreakdown.map((ep) => {
          const isOpen = openEpisodes.has(ep.episodeNumber)
          const hasDonors = ep.donors.length > 0

          return (
            <div key={ep.episodeNumber} className={styles.accordionItem}>
              <div
                className={styles.accordionHeader}
                onClick={() => hasDonors && toggleEpisode(ep.episodeNumber)}
              >
                <div className={styles.accordionLeft}>
                  <span className={styles.accordionStatus}>
                    {ep.isFinalized ? '✅' : '⏳'}
                  </span>
                  <span>{ep.episodeNumber}화 - {ep.episodeTitle}</span>
                  {hasDonors ? (
                    <span className={styles.accordionCount}>({ep.donors.length}명)</span>
                  ) : (
                    <span className={styles.accordionEmptyLabel}>(달성자 없음)</span>
                  )}
                </div>
                {hasDonors && (
                  <ChevronDown
                    size={18}
                    className={`${styles.accordionChevron} ${isOpen ? styles.accordionChevronOpen : ''}`}
                  />
                )}
              </div>

              {isOpen && hasDonors && (
                <div className={styles.accordionBody}>
                  <table className={styles.episodeTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th style={{ textAlign: 'left' }}>닉네임</th>
                        <th>하트</th>
                        <th>시그 자격</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.donors.map((d, idx) => (
                        <tr key={d.donorName}>
                          <td>{idx + 1}</td>
                          <td className={styles.donorName}>{d.donorName}</td>
                          <td>{d.totalAmount.toLocaleString()}</td>
                          <td>
                            <SigLabel label={d.sigLabel} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* C. 등급별 명예의 전당 */}
      <div className={styles.hallSection}>
        <h4 className={styles.sectionTitle}>등급별 명예의 전당</h4>
        <p className={styles.sectionDesc}>
          시그니처 획득 이력 (달성 경로 표시)
        </p>

        {GRADE_CONFIG.map(({ key, emoji, label, color }) => {
          const donors = summary[key]
          if (donors.length === 0) return null

          return (
            <div key={key} className={styles.hallGroup}>
              <div className={styles.hallGroupTitle} style={{ color }}>
                <span>{emoji}</span>
                <span>{label} ({donors.length}명)</span>
              </div>
              {donors.map((d) => (
                <div key={d.donorName} className={styles.hallItem}>
                  <span className={styles.hallDonorName}>{d.donorName}</span>
                  <div className={styles.hallPath}>
                    {d.history.map((h, idx) => (
                      <span key={h.ep}>
                        {idx > 0 && <span className={styles.hallArrow}> → </span>}
                        <span className={styles.hallStep}>
                          {h.ep}화({h.amount.toLocaleString()})
                          {unsyncedSet.has(`${d.donorName}|${idx + 1}`) && (
                            <span className={styles.newBadge}>NEW</span>
                          )}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SigLabel({ label }: { label: string }) {
  if (label.startsWith('🆕')) {
    return <span className={`${styles.sigBadge} ${styles.sigNew}`}>{label}</span>
  }
  if (label.startsWith('✅')) {
    return <span className={`${styles.sigBadge} ${styles.sigComplete}`}>{label}</span>
  }
  if (label.startsWith('(')) {
    return <span className={`${styles.sigBadge} ${styles.sigNeeded}`}>{label}</span>
  }
  return <span>{label}</span>
}
