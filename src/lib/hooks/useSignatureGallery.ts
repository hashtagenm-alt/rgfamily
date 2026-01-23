'use client'

/**
 * useSignatureGallery Hook
 *
 * 시그니처 갤러리 데이터 조회 훅
 * - Repository 패턴 적용
 * - 시그니처 + 영상 데이터 조회
 * - 필터링 (unit, category, range, search)
 */

import { useState, useCallback, useEffect } from 'react'
import { useSignatures, useSupabaseContext } from '@/lib/context'
import { withRetry } from '@/lib/utils/fetch-with-retry'

// 시그니처 영상 타입
export interface SignatureVideo {
  id: number
  memberId: number
  memberName: string
  memberImage: string | null
  videoUrl: string
  createdAt: string
}

// 시그니처 데이터 타입
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

// 필터 타입
type UnitFilter = 'all' | 'excel' | 'crew'
type CategoryFilter = 'all' | 'new'
type RangeFilter = 'all' | '1000-1999' | '2000-4999' | '5000-9999' | '10000-29999' | '30000+'

// 번호 범위 정의
const RANGE_CONFIG: Record<RangeFilter, { min: number; max: number }> = {
  'all': { min: 0, max: Infinity },
  '1000-1999': { min: 1, max: 1999 },
  '2000-4999': { min: 2000, max: 4999 },
  '5000-9999': { min: 5000, max: 9999 },
  '10000-29999': { min: 10000, max: 29999 },
  '30000+': { min: 30000, max: Infinity },
}

interface UseSignatureGalleryReturn {
  signatures: SignatureData[]
  isLoading: boolean
  error: string | null
  unitFilter: UnitFilter
  categoryFilter: CategoryFilter
  rangeFilter: RangeFilter
  searchQuery: string
  setUnitFilter: (filter: UnitFilter) => void
  setCategoryFilter: (filter: CategoryFilter) => void
  setRangeFilter: (filter: RangeFilter) => void
  setSearchQuery: (query: string) => void
  refetch: () => Promise<void>
}

export function useSignatureGallery(): UseSignatureGalleryReturn {
  const signaturesRepo = useSignatures()
  const supabase = useSupabaseContext()

  // State
  const [signatures, setSignatures] = useState<SignatureData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchSignatures = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Repository를 통해 시그니처 조회
      let sigData = unitFilter === 'all'
        ? await signaturesRepo.findAll()
        : await signaturesRepo.findByUnit(unitFilter as 'excel' | 'crew')

      // 신규 필터: 최근 10개만
      if (categoryFilter === 'new') {
        sigData = [...sigData]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
      }

      // Range 필터
      if (rangeFilter !== 'all') {
        const range = RANGE_CONFIG[rangeFilter]
        sigData = sigData.filter(sig => sig.sig_number >= range.min && sig.sig_number <= range.max)
      }

      // 각 시그니처의 영상 목록 조회
      const sigIds = sigData.map((s) => s.id)
      const { data: videoData } = await withRetry(async () =>
        await supabase
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
      )

      // 시그니처별 영상 매핑
      const videosBySignature: Record<number, SignatureVideo[]> = {}
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

      // SignatureData 형식으로 변환
      let converted: SignatureData[] = sigData.map((row) => ({
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
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        converted = converted.filter(sig =>
          sig.title.toLowerCase().includes(query) ||
          sig.sigNumber.toString().includes(query) ||
          sig.videos.some(v => v.memberName.toLowerCase().includes(query))
        )
      }

      // 정렬
      converted.sort((a, b) => a.sigNumber - b.sigNumber)

      setSignatures(converted)
    } catch (err) {
      console.error('시그니처 로드 실패:', err)
      setError(err instanceof Error ? err.message : '시그니처를 불러오는데 실패했습니다.')
      setSignatures([])
    } finally {
      setIsLoading(false)
    }
  }, [signaturesRepo, supabase, unitFilter, categoryFilter, rangeFilter, searchQuery])

  useEffect(() => {
    fetchSignatures()
  }, [fetchSignatures])

  return {
    signatures,
    isLoading,
    error,
    unitFilter,
    categoryFilter,
    rangeFilter,
    searchQuery,
    setUnitFilter,
    setCategoryFilter,
    setRangeFilter,
    setSearchQuery,
    refetch: fetchSignatures,
  }
}
