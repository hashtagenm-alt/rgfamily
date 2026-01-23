'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useSignatureGallery, type SignatureData } from '@/lib/hooks'
import SigCard from './SigCard'
import SigDetailModal from './SigDetailModal'
import styles from './SigGallery.module.css'

// Re-export types for backward compatibility
export type { SignatureData, SignatureVideo } from '@/lib/hooks'

// 필터 카테고리
const signatureCategories = [
  { id: 'all', label: '전체' },
  { id: 'new', label: '신규' },
] as const

// 번호 범위 필터
const signatureRanges = [
  { id: 'all', label: '전체' },
  { id: '1000-1999', label: '1000~' },
  { id: '2000-4999', label: '2000~' },
  { id: '5000-9999', label: '5000~' },
  { id: '10000-29999', label: '1만~' },
  { id: '30000+', label: '3만~' },
] as const

export default function SigGallery() {
  const [selectedSig, setSelectedSig] = useState<SignatureData | null>(null)

  // Hook에서 데이터와 필터 상태 관리
  const {
    signatures,
    isLoading,
    unitFilter,
    categoryFilter,
    rangeFilter,
    searchQuery,
    setUnitFilter,
    setCategoryFilter,
    setRangeFilter,
    setSearchQuery,
  } = useSignatureGallery()

  return (
    <div className={styles.container}>
      {/* Unit Toggle */}
      <div className={styles.unitToggle}>
        <button
          className={`${styles.unitBtn} ${unitFilter === 'all' ? styles.active : ''}`}
          onClick={() => setUnitFilter('all')}
        >
          ALL
        </button>
        <button
          className={`${styles.unitBtn} ${unitFilter === 'excel' ? styles.active : ''}`}
          onClick={() => setUnitFilter('excel')}
        >
          EXCEL
        </button>
        <button
          className={`${styles.unitBtn} ${styles.crewBtn} ${unitFilter === 'crew' ? styles.active : ''}`}
          onClick={() => setUnitFilter('crew')}
        >
          CREW
        </button>
      </div>

      {/* Filters - cnine style */}
      <div className={styles.filterBar}>
        {/* All Filters in one row */}
        <div className={styles.filterTabs}>
          {/* Category Tabs */}
          {signatureCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`${styles.filterTab} ${categoryFilter === cat.id ? styles.active : ''}`}
            >
              {cat.label}
            </button>
          ))}

          {/* Divider */}
          <div className={styles.filterDivider} />

          {/* Range Tabs */}
          {signatureRanges.map((range) => (
            <button
              key={range.id}
              onClick={() => setRangeFilter(range.id)}
              className={`${styles.filterTab} ${rangeFilter === range.id ? styles.activeRange : ''}`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={styles.clearSearch}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Gallery Grid - cnine 6-column style */}
      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>시그니처를 불러오는 중...</span>
        </div>
      ) : signatures.length === 0 ? (
        <div className={styles.empty}>
          <p>등록된 시그니처가 없습니다</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {signatures.map((sig) => (
            <SigCard
              key={sig.id}
              signature={sig}
              onClick={() => setSelectedSig(sig)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedSig && (
          <SigDetailModal
            signature={selectedSig}
            onClose={() => setSelectedSig(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
