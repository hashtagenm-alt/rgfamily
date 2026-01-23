'use client'

/**
 * useBjRanks Hook
 *
 * bj_ranks 테이블에서 직급 데이터를 가져와 관리하는 훅
 * lib/constants/ranks.ts를 대체하여 DB 기반으로 직급 시스템 관리
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSupabaseContext } from '@/lib/context'

// DB에서 가져온 직급 타입
export interface BjRank {
  id: number
  name: string
  level: number
  display_order: number
  color: string | null
  emoji: string | null
  tier: 'royal' | 'noble' | 'servant' | 'slave' | null
  icon_url: string | null
  description: string | null
}

interface UseBjRanksReturn {
  /** 전체 직급 목록 (level 순으로 정렬) */
  ranks: BjRank[]
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 데이터 새로고침 */
  refresh: () => Promise<void>
  /** level(순위)로 직급 조회 */
  getRankByLevel: (level: number) => BjRank | null
  /** ID로 직급 조회 */
  getRankById: (id: number) => BjRank | null
  /** 직급명으로 조회 */
  getRankByName: (name: string) => BjRank | null
  /** 순위에 해당하는 직급명 반환 */
  getRankName: (level: number) => string
  /** 순위에 해당하는 이모지 반환 */
  getRankEmoji: (level: number) => string
  /** 직급 색상 조회 */
  getRankColor: (level: number) => string
  /** 직급 티어 조회 */
  getRankTier: (level: number) => BjRank['tier'] | null
  /** 직급 표시 문자열 (이모지 + 이름) */
  getRankDisplay: (level: number) => string
  /** VIP Top 3 여부 (royal 티어) */
  isVipRank: (level: number) => boolean
  /** 총 직급 수 */
  totalRanks: number
}

export function useBjRanks(): UseBjRanksReturn {
  const supabase = useSupabaseContext()
  const [ranks, setRanks] = useState<BjRank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRanks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('bj_ranks')
        .select('*')
        .order('level', { ascending: true })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setRanks(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : '직급 데이터를 불러오는데 실패했습니다'
      setError(message)
      console.error('bj_ranks 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchRanks()
  }, [fetchRanks])

  // 유틸리티 함수들
  const getRankByLevel = useCallback(
    (level: number): BjRank | null => {
      return ranks.find((r) => r.level === level) || null
    },
    [ranks]
  )

  const getRankById = useCallback(
    (id: number): BjRank | null => {
      return ranks.find((r) => r.id === id) || null
    },
    [ranks]
  )

  const getRankByName = useCallback(
    (name: string): BjRank | null => {
      return ranks.find((r) => r.name === name) || null
    },
    [ranks]
  )

  const getRankName = useCallback(
    (level: number): string => {
      const rank = getRankByLevel(level)
      return rank ? rank.name : `${level}위`
    },
    [getRankByLevel]
  )

  const getRankEmoji = useCallback(
    (level: number): string => {
      const rank = getRankByLevel(level)
      return rank?.emoji || '🏅'
    },
    [getRankByLevel]
  )

  const getRankColor = useCallback(
    (level: number): string => {
      const rank = getRankByLevel(level)
      return rank?.color || '#888888'
    },
    [getRankByLevel]
  )

  const getRankTier = useCallback(
    (level: number): BjRank['tier'] | null => {
      const rank = getRankByLevel(level)
      return rank?.tier || null
    },
    [getRankByLevel]
  )

  const getRankDisplay = useCallback(
    (level: number): string => {
      const rank = getRankByLevel(level)
      if (!rank) return `${level}위`
      return `${rank.emoji || ''} ${rank.name}`.trim()
    },
    [getRankByLevel]
  )

  const isVipRank = useCallback(
    (level: number): boolean => {
      const rank = getRankByLevel(level)
      return rank?.tier === 'royal'
    },
    [getRankByLevel]
  )

  const totalRanks = useMemo(() => ranks.length, [ranks])

  return {
    ranks,
    isLoading,
    error,
    refresh: fetchRanks,
    getRankByLevel,
    getRankById,
    getRankByName,
    getRankName,
    getRankEmoji,
    getRankColor,
    getRankTier,
    getRankDisplay,
    isVipRank,
    totalRanks,
  }
}

export default useBjRanks
