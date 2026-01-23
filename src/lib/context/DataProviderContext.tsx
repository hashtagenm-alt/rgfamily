'use client'

/**
 * DataProvider Context
 *
 * 전역 데이터 접근 계층
 * - Repository Pattern 적용
 * - Mock/Supabase 자동 전환
 * - 타입 안전한 데이터 접근
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

  const value: DataProviderContextType = {
    provider,
    isReady: true,
  }

  return (
    <DataProviderContext.Provider value={value}>
      {children}
    </DataProviderContext.Provider>
  )
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
 */
export function useRankings() {
  const { provider } = useDataProviderContext()
  return provider.rankings
}

export function useSeasons() {
  const { provider } = useDataProviderContext()
  return provider.seasons
}

export function useProfiles() {
  const { provider } = useDataProviderContext()
  return provider.profiles
}

export function useOrganization() {
  const { provider } = useDataProviderContext()
  return provider.organization
}

export function useNotices() {
  const { provider } = useDataProviderContext()
  return provider.notices
}

export function usePosts() {
  const { provider } = useDataProviderContext()
  return provider.posts
}

export function useTimeline() {
  const { provider } = useDataProviderContext()
  return provider.timeline
}

export function useSchedules() {
  const { provider } = useDataProviderContext()
  return provider.schedules
}

export function useComments() {
  const { provider } = useDataProviderContext()
  return provider.comments
}

export function useSignatures() {
  const { provider } = useDataProviderContext()
  return provider.signatures
}

export function useVipRewards() {
  const { provider } = useDataProviderContext()
  return provider.vipRewards
}

export function useVipImages() {
  const { provider } = useDataProviderContext()
  return provider.vipImages
}

export function useMedia() {
  const { provider } = useDataProviderContext()
  return provider.media
}

export function useBanners() {
  const { provider } = useDataProviderContext()
  return provider.banners
}

export function useLiveStatus() {
  const { provider } = useDataProviderContext()
  return provider.liveStatus
}

export function useGuestbook() {
  const { provider } = useDataProviderContext()
  return provider.guestbook
}
