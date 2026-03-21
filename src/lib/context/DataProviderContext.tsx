'use client'

/**
 * DataProvider Context - Repository Pattern convenience hooks
 *
 * 이 컨텍스트의 hook들은 Repository 패턴을 통해 데이터에 접근합니다.
 *
 * ⚠️ ADR-005 준수: src/app/ 페이지에서 직접 supabase.from() 호출 금지.
 *    대신 src/lib/actions/ 의 Server Action 또는 이 컨텍스트의 hook을 사용하세요.
 *
 * 활성 hooks: useRankings, useSeasons, useOrganization, useNotices,
 *            useTimeline, useSchedules, useSignatures
 */

import { createContext, useContext, useMemo, ReactNode } from 'react'
import { useSupabaseContext } from './SupabaseContext'
import { createDataProvider, IDataProvider } from '@/lib/repositories'

interface DataProviderContextType {
  provider: IDataProvider
  isReady: boolean
}

const DataProviderContext = createContext<DataProviderContextType | undefined>(undefined)

export function DataProviderProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabaseContext()

  const provider = useMemo(() => {
    return createDataProvider(supabase)
  }, [supabase])

  const value = useMemo<DataProviderContextType>(() => ({ provider, isReady: true }), [provider])

  return <DataProviderContext.Provider value={value}>{children}</DataProviderContext.Provider>
}

export function useDataProviderContext() {
  const context = useContext(DataProviderContext)
  if (context === undefined) {
    throw new Error('useDataProviderContext must be used within a DataProviderProvider')
  }
  return context
}

/**
 * Convenience hooks for specific repositories
 *
 * Active hooks (7): useRankings, useSeasons, useOrganization,
 * useNotices, useTimeline, useSchedules, useSignatures
 *
 * Removed dead hooks (9): useProfiles, usePosts, useComments,
 * useVipRewards, useVipImages, useMedia, useBanners, useLiveStatus, useGuestbook
 */
export function useRankings() {
  const { provider } = useDataProviderContext()
  return provider.rankings
}

export function useSeasons() {
  const { provider } = useDataProviderContext()
  return provider.seasons
}

export function useOrganization() {
  const { provider } = useDataProviderContext()
  return provider.organization
}

export function useNotices() {
  const { provider } = useDataProviderContext()
  return provider.notices
}

export function useTimeline() {
  const { provider } = useDataProviderContext()
  return provider.timeline
}

export function useSchedules() {
  const { provider } = useDataProviderContext()
  return provider.schedules
}

export function useSignatures() {
  const { provider } = useDataProviderContext()
  return provider.signatures
}
