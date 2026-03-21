// Backward-compatible re-exports (ADR-005)
// Note: No 'use server' directive here because this file re-exports types.
// Server action functions are marked 'use server' in their respective module files.

export type {
  BjStats,
  TimePatternData,
  DonorBjRelation,
  DonorPattern,
  EpisodeComparison,
  DonorSearch,
  AnalyticsSummary,
  EpisodeTrendData,
  DonorRetentionData,
  BjDonorDetail,
  BjGrowthMetrics,
  BjDetailedStats,
  TimePatternEnhanced,
  BjEpisodeTrendData,
  SignatureEligibilityData,
  DashboardStatsData,
} from './types'

export { getAnalyticsSummary, getEpisodeList, getSeasonList, getDashboardStats } from './summary'
export { getEpisodeTrend, compareEpisodes } from './episodes'
export { getBjStats, getBjEpisodeTrend, getBjDetailedStats, getSignatureEligibility } from './bj'
export { getDonorPatterns, searchDonor, getDonorRetention, getDonorBjRelations, getTimePattern, getTimePatternEnhanced } from './donors'

// Advanced analytics
export type { ChurnPredictionEntry, ChurnPredictionData, RFMEntry, RFMData, BjAffinityEntry, BjExclusivity, BjAffinityData, BjInsightEntry, BjInsightsData } from './types'
export { getAdvancedChurnPrediction, getDonorRFMAnalysis, getBjAffinityMatrix, getBjActionableInsights } from './advanced'
