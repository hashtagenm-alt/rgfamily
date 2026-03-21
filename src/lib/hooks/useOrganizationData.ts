'use client'

/**
 * useOrganizationData Hook
 *
 * Organization 데이터 로딩 및 상태 관리를 위한 커스텀 훅
 * - Repository 패턴 활용
 * - 로딩/에러 상태 관리
 * - 실시간 업데이트 구독 (옵션)
 */

import { useState, useEffect, useCallback } from 'react'
import { useOrganization } from '@/lib/context'
import { logger } from '@/lib/utils/logger'
import { useSupabaseContext } from '@/lib/context'
import type { Organization } from '@/types/database'
import type { UnitType, GroupableMember } from '@/types/organization'

interface UseOrganizationDataOptions {
  /** 특정 유닛만 필터링 */
  unit?: UnitType
  /** 라이브 멤버만 필터링 */
  liveOnly?: boolean
  /** 실시간 업데이트 구독 여부 */
  realtime?: boolean
}

interface UseOrganizationDataReturn {
  /** 조직 멤버 목록 */
  members: Organization[]
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 데이터 새로고침 */
  refresh: () => Promise<void>
  /** 유닛별 필터링된 멤버 반환 */
  getByUnit: (unit: UnitType) => Organization[]
  /** 라이브 멤버만 반환 */
  getLiveMembers: () => Organization[]
  /** 역할별 그룹화된 멤버 반환 (제네릭 타입 지원) */
  getGroupedByRole: <T extends GroupableMember>(members: T[]) => {
    leaders: T[]
    directors: T[]
    managers: T[]
    members: T[]
  }
}

export function useOrganizationData(
  options: UseOrganizationDataOptions = {}
): UseOrganizationDataReturn {
  const { unit, liveOnly = false, realtime = false } = options

  const organizationRepo = useOrganization()
  const supabase = useSupabaseContext()

  const [members, setMembers] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 데이터 페칭 함수
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let data: Organization[]

      if (liveOnly) {
        data = await organizationRepo.findLiveMembers()
      } else if (unit) {
        data = await organizationRepo.findByUnit(unit)
      } else {
        data = await organizationRepo.findAll()
      }

      setMembers(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다'
      setError(message)
      logger.error('Organization data fetch error', err)
    } finally {
      setIsLoading(false)
    }
  }, [organizationRepo, unit, liveOnly])

  // 초기 데이터 로드 및 실시간 구독
  useEffect(() => {
    fetchData()

    if (!realtime) return

    // Supabase 실시간 구독
    const channel = supabase
      .channel('organization_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organization' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData, supabase, realtime])

  // 유틸리티 함수들
  const getByUnit = useCallback(
    (targetUnit: UnitType): Organization[] => {
      return members.filter((m) => m.unit === targetUnit)
    },
    [members]
  )

  const getLiveMembers = useCallback((): Organization[] => {
    return members.filter((m) => m.is_live)
  }, [members])

  const getGroupedByRole = useCallback(
    <T extends GroupableMember>(memberList: T[]) => {
      const leaders = memberList.filter(
        (m) => m.role === '대표' || m.role === 'R대표' || m.role === 'G대표'
      )
      // 부장/팀장은 현재 사용하지 않지만 호환성 유지
      const directors: T[] = []
      const managers: T[] = []
      const regularMembers = memberList.filter(
        (m) => m.role === '멤버' || m.role === '크루'
      )
      return { leaders, directors, managers, members: regularMembers }
    },
    []
  )

  return {
    members,
    isLoading,
    error,
    refresh: fetchData,
    getByUnit,
    getLiveMembers,
    getGroupedByRole,
  }
}

export default useOrganizationData
