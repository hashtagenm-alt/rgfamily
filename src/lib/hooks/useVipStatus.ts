'use client'

import { useEffect, useState } from 'react'
import { useAuthContext, useSupabaseContext } from '@/lib/context'
import { USE_MOCK_DATA } from '@/lib/config'
import { logger } from '@/lib/utils/logger'
import type { Role } from '@/types/database'

interface VipStatusResult {
  isVip: boolean
  isLoading: boolean
  rank: number | null
  totalAmount: number | null
}

const VIP_ROLES: Role[] = ['vip', 'moderator', 'admin', 'superadmin']

export function useVipStatus(): VipStatusResult {
  const supabase = useSupabaseContext()
  const { user, profile, isLoading: authLoading } = useAuthContext()
  const [isVip, setIsVip] = useState(false)
  const [rank, setRank] = useState<number | null>(null)
  const [totalAmount, setTotalAmount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 인증 로딩 중이면 아무것도 하지 않음
    if (authLoading) {
      setIsLoading(true)
      return
    }

    const fetchVipStatus = async () => {
      setIsLoading(true)

      if (!user) {
        setIsVip(false)
        setRank(null)
        setTotalAmount(null)
        setIsLoading(false)
        return
      }

      if (USE_MOCK_DATA) {
        setIsVip(true)
        setRank(5)
        setTotalAmount(null)
        setIsLoading(false)
        return
      }

      if (profile?.role && VIP_ROLES.includes(profile.role)) {
        setIsVip(true)
        setRank(null)
        setTotalAmount(null)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('get_user_rank', {
        p_user_id: user.id,
      })

      if (error) {
        logger.dbError('rpc', 'get_user_rank', error)
        setIsVip(false)
        setRank(null)
        setTotalAmount(null)
        setIsLoading(false)
        return
      }

      const row = Array.isArray(data) ? data[0] : null
      const userRank = row?.rank ?? null
      setRank(userRank)
      setTotalAmount(row?.total_amount ?? null)
      setIsVip(userRank !== null && userRank <= 50)
      setIsLoading(false)
    }

    fetchVipStatus()
  }, [authLoading, user, profile, supabase])

  return { isVip, isLoading, rank, totalAmount }
}
