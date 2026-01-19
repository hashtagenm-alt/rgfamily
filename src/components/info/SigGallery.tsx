'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import SigCard from './SigCard'
import SigDetailModal from './SigDetailModal'
import styles from './SigGallery.module.css'

// 시그니처 타입 정의
export interface SignatureVideo {
  id: number
  memberId: number
  memberName: string
  memberImage: string | null
  videoUrl: string
  createdAt: string
}

export interface SignatureData {
  id: number
  sigNumber: number
  title: string
  description: string
  thumbnailUrl: string
  unit: 'excel' | 'crew' | null
  isGroup: boolean
  videos: SignatureVideo[]
  createdAt: string
}

// 필터 카테고리
const signatureCategories = [
  { id: 'all', label: '전체' },
  { id: 'new', label: '신규' },
] as const

// 번호 범위 필터
const signatureRanges = [
  { id: 'all', label: '전체', min: 0, max: Infinity },
  { id: '1000-1999', label: '1000~', min: 1, max: 1999 },
  { id: '2000-4999', label: '2000~', min: 2000, max: 4999 },
  { id: '5000-9999', label: '5000~', min: 5000, max: 9999 },
  { id: '10000-29999', label: '1만~', min: 10000, max: 29999 },
  { id: '30000+', label: '3만~', min: 30000, max: Infinity },
] as const

type CategoryFilter = typeof signatureCategories[number]['id']
type RangeFilter = typeof signatureRanges[number]['id']
type UnitFilter = 'all' | 'excel' | 'crew'

export default function SigGallery() {
  const supabase = useSupabaseContext()
  const [signatures, setSignatures] = useState<SignatureData[]>([])
  const [selectedSig, setSelectedSig] = useState<SignatureData | null>(null)
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchSignatures = useCallback(async () => {
    setIsLoading(true)

    // Supabase에서 시그니처 데이터 조회
    try {
      const { data: sigData, error: sigError } = await withRetry(async () => {
        let query = supabase
          .from('signatures')
          .select('*')
          .order('sig_number', { ascending: true })

        if (unitFilter !== 'all') {
          query = query.eq('unit', unitFilter)
        }


        return await query
      })

      if (sigError) {
        console.error('시그니처 로드 실패:', sigError)
        setSignatures([])
        setIsLoading(false)
        return
      }

      // 신규 필터: 최근 10개만
      let signaturesList = sigData || []
      if (categoryFilter === 'new') {
        signaturesList = [...signaturesList]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
      }

      // Range filter
      if (rangeFilter !== 'all') {
        const range = signatureRanges.find(r => r.id === rangeFilter)
        if (range) {
          signaturesList = signaturesList.filter(sig => sig.sig_number >= range.min && sig.sig_number <= range.max)
        }
      }

      // 각 시그니처의 영상 목록 조회
      const sigIds = signaturesList.map((s) => s.id)
      const { data: videoData } = await supabase
        .from('signature_videos')
        .select(`
          id,
          signature_id,
          member_id,
          video_url,
          created_at,
          organization!member_id(id, name, image_url)
        `)
        .in('signature_id', sigIds)
        .order('created_at', { ascending: false })

      // 시그니처별 영상 매핑
      const videosBySignature: Record<number, SignatureData['videos']> = {}
      ;(videoData || []).forEach((v) => {
        const org = v.organization as unknown
        const member = org as { id: number; name: string; image_url: string | null } | null
        if (!videosBySignature[v.signature_id]) {
          videosBySignature[v.signature_id] = []
        }
        videosBySignature[v.signature_id].push({
          id: v.id,
          memberId: v.member_id,
          memberName: member?.name || '알 수 없음',
          memberImage: member?.image_url || null,
          videoUrl: v.video_url,
          createdAt: v.created_at,
        })
      })

      // DB 데이터를 SignatureData 형식으로 변환
      const converted: SignatureData[] = signaturesList.map((row) => ({
        id: row.id,
        sigNumber: row.sig_number,
        title: row.title,
        description: row.description || '',
        thumbnailUrl: row.thumbnail_url || '',
        unit: row.unit,
        isGroup: row.is_group || false,
        videos: videosBySignature[row.id] || [],
        createdAt: row.created_at,
      }))

      // 검색 필터 적용
      let filtered = converted
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(sig =>
          sig.title.toLowerCase().includes(query) ||
          sig.sigNumber.toString().includes(query) ||
          sig.videos.some(v => v.memberName.toLowerCase().includes(query))
        )
      }

      // 정렬
      filtered.sort((a, b) => a.sigNumber - b.sigNumber)

      setSignatures(filtered)
    } catch (err) {
      console.error('시그니처 로드 중 오류:', err)
      setSignatures([])
    }

    setIsLoading(false)
  }, [supabase, unitFilter, categoryFilter, rangeFilter, searchQuery])

  useEffect(() => {
    fetchSignatures()
  }, [fetchSignatures])

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
        <motion.div className={styles.grid} layout>
          <AnimatePresence>
            {signatures.map((sig) => (
              <SigCard
                key={sig.id}
                signature={sig}
                onClick={() => setSelectedSig(sig)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
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
