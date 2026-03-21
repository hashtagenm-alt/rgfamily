'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuthContext, useSupabaseContext } from '@/lib/context'
import { logger } from '@/lib/utils/logger'

interface HonorQualificationResult {
  isQualified: boolean
  isLoading: boolean
  rank: number | null
  seasonId: number | null
}

interface CachedResult {
  userId: string
  role: string | null
  isQualified: boolean
  rank: number | null
  seasonId: number | null
}

export function useHonorQualification(): HonorQualificationResult {
  const supabase = useSupabaseContext()
  const { user, profile, isLoading: authLoading } = useAuthContext()
  const [isQualified, setIsQualified] = useState(false)
  const [rank, setRank] = useState<number | null>(null)
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const cacheRef = useRef<CachedResult | null>(null)

  useEffect(() => {
    const fetchQualification = async () => {
      if (authLoading) return

      if (!user) {
        setIsQualified(false)
        setRank(null)
        setSeasonId(null)
        setIsLoading(false)
        cacheRef.current = null
        return
      }

      // 캐시 히트: 동일 user + 동일 role이면 DB 쿼리 스킵
      const cached = cacheRef.current
      if (cached && cached.userId === user.id && cached.role === (profile?.role ?? null)) {
        setIsQualified(cached.isQualified)
        setRank(cached.rank)
        setSeasonId(cached.seasonId)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      if (profile?.role === 'admin' || profile?.role === 'superadmin') {
        cacheRef.current = {
          userId: user.id,
          role: profile.role,
          isQualified: true,
          rank: null,
          seasonId: null,
        }
        setIsQualified(true)
        setRank(null)
        setSeasonId(null)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('vip_rewards')
        .select('rank, season_id')
        .eq('profile_id', user.id)
        .lte('rank', 3)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        logger.error('헌정 자격 조회 실패', error)
        setIsQualified(false)
        setRank(null)
        setSeasonId(null)
        setIsLoading(false)
        return
      }

      const reward = Array.isArray(data) ? data[0] : null
      const rewardRank = reward?.rank ?? null
      const rewardSeasonId = reward?.season_id ?? null
      const qualified = rewardRank !== null && rewardRank <= 3

      cacheRef.current = {
        userId: user.id,
        role: profile?.role ?? null,
        isQualified: qualified,
        rank: rewardRank,
        seasonId: rewardSeasonId,
      }

      setRank(rewardRank)
      setSeasonId(rewardSeasonId)
      setIsQualified(qualified)
      setIsLoading(false)
    }

    fetchQualification()
  }, [authLoading, user, profile, supabase])

  return { isQualified, isLoading, rank, seasonId }
}
