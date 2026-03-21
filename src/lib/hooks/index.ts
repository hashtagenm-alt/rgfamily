/**
 * Hooks Module
 *
 * 권장: @/lib/context 에서 직접 import
 *
 * Note: useOrganization은 useOrganizationData의 alias입니다.
 * Context의 useOrganization(Repository 접근)과 구분됩니다.
 */

// Admin hooks
export { useAdminCRUD, type AdminCRUDConfig, type AdminCRUDReturn } from './useAdminCRUD'

// Domain hooks
export { useSchedule } from './useSchedule'
export { useRanking } from './useRanking'
export { useOrganizationData } from './useOrganizationData'
export { useOrganization } from './useOrganization'
export { useVipStatus } from './useVipStatus'
export { useVipProfileData, type VipRewardData } from './useVipProfileData'
export { useVipPodiumAchievers } from './useVipPodiumAchievers'
export { useHonorQualification } from './useHonorQualification'
export { useLiveRoster } from './useLiveRoster'
export { useLiveStatusPolling } from './useLiveStatusPolling'
export { useTributeData } from './useTributeData'
export { useGuestbook } from './useGuestbook'
export { useContentProtection } from './useContentProtection'
export { useBjMemberStatus } from './useBjMemberStatus'
export { useBjMessages } from './useBjMessages'
export { useVipMessages } from './useVipMessages'
export { useVipMessageComments } from './useVipMessageComments'
export { useEpisodes } from './useEpisodes'
export { useBjRanks, type BjRank } from './useBjRanks'
export { useSignatureGallery, type SignatureData, type SignatureVideo } from './useSignatureGallery'
export { useScheduleEventTypes, type ScheduleEventType } from './useScheduleEventTypes'
export { useAlert, AlertProvider } from './useAlert'
export { useLazyLoad } from './useLazyLoad'
export { useInfiniteScroll } from './useInfiniteScroll'
export {
  useTimelineData,
  type GroupedEvents,
  type UseTimelineDataOptions,
  type UseTimelineDataReturn,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  SEASON_COLORS,
  getCategoryColor,
  getSeasonColor,
} from './useTimelineData'
export { useAnalytics } from './useAnalytics'
export {
  useAnalyticsSummary,
  type UseAnalyticsSummaryOptions,
  type UseAnalyticsSummaryReturn,
} from './useAnalyticsSummary'
export {
  useAnalyticsDonors,
  type UseAnalyticsDonorsOptions,
  type UseAnalyticsDonorsReturn,
} from './useAnalyticsDonors'
export {
  useAnalyticsBj,
  type UseAnalyticsBjOptions,
  type UseAnalyticsBjReturn,
} from './useAnalyticsBj'
export {
  useAnalyticsAdvanced,
  type UseAnalyticsAdvancedOptions,
  type UseAnalyticsAdvancedReturn,
} from './useAnalyticsAdvanced'
export { useImageUpload } from './useImageUpload'

// Re-export from Context (recommended)
export {
  useTheme,
  useSupabaseContext,
  useAuthContext,
  useDataProviderContext,
  useRankings,
  useSeasons,
  useNotices,
} from '@/lib/context'
