'use client'

/**
 * 명예의 전당 Hooks
 *
 * Server Action을 호출하여 명예의 전당 데이터를 관리합니다.
 */

import { useState, useEffect, useCallback } from 'react'
import { getHallOfFameData, getUserPodiumHistory } from '@/lib/actions/hall-of-fame'
import type { HallOfFameData, HallOfFameEntry } from '@/types/ranking'

interface UseHallOfFameResult {
  data: HallOfFameData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * 명예의 전당 전체 데이터 조회 Hook
 */
export function useHallOfFame(): UseHallOfFameResult {
  const [data, setData] = useState<HallOfFameData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getHallOfFameData()

      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        setData(result.data)
      }
    } catch (err) {
      console.error('명예의 전당 데이터 조회 실패:', err)
      setError('데이터를 불러오는 데 실패했습니다.')
      setData(null)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

interface UseUserPodiumHistoryResult {
  entries: HallOfFameEntry[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * 특정 사용자의 포디움 이력 조회 Hook
 */
export function useUserPodiumHistory(
  profileId: string | null | undefined
): UseUserPodiumHistoryResult {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profileId) {
      setEntries([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getUserPodiumHistory(profileId)

      if (result.error) {
        setError(result.error)
        setEntries([])
      } else {
        setEntries(result.data || [])
      }
    } catch (err) {
      console.error('포디움 이력 조회 실패:', err)
      setError('포디움 이력을 불러오는 데 실패했습니다.')
      setEntries([])
    }

    setIsLoading(false)
  }, [profileId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    entries,
    isLoading,
    error,
    refetch: fetchData,
  }
}
