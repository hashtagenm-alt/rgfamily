// ==================== 타입 정의 ====================

export interface BjStats {
  bj_name: string
  total_hearts: number
  donation_count: number
  unique_donors: number
  avg_donation: number
}

export interface TimePatternData {
  hour: number
  total_hearts: number
  donation_count: number
}

export interface DonorBjRelation {
  donor_name: string
  bj_name: string
  total_hearts: number
  donation_count: number
}

export interface DonorPattern {
  donor_name: string
  total_hearts: number
  donation_count: number
  unique_bjs: number
  max_bj_ratio: number
  avg_donation: number
  pattern_type: '올인형' | '분산형' | '소액다건' | '고액소건' | '꾸준형' | '급성장형' | '일반'
  favorite_bj: string
  episodes_participated: number
  first_episode: number
  last_episode: number
  trend: 'increasing' | 'decreasing' | 'stable'
  consistency_score: number   // 0~100, 참여 안정성 (표준편차 기반)
  loyalty_score: number       // 0~100, 참여율 (참여 회차 / 전체 회차)
  recency_score: number       // 0~100, 최근 활동 빈도
  growth_rate: number         // 선형 회귀 기반 성장률 (% per episode)
  bj_distribution: { bj_name: string; hearts: number; percent: number }[]
  peak_hours: { hour: number; count: number }[] // KST 기준, count 내림차순 Top 3
}

export interface EpisodeComparison {
  episode1: {
    id: number
    title: string
    total_hearts: number
    donation_count: number
    unique_donors: number
  }
  episode2: {
    id: number
    title: string
    total_hearts: number
    donation_count: number
    unique_donors: number
  }
  donor_changes: {
    continued: number
    new_donors: number
    left_donors: number
  }
  bj_changes: {
    bj_name: string
    ep1_hearts: number
    ep2_hearts: number
    change: number
    change_percent: number
  }[]
}

export interface DonorSearch {
  donor_name: string
  total_hearts: number
  donation_count: number
  episodes: {
    episode_id: number
    episode_title: string
    hearts: number
    count: number
  }[]
  bj_distribution: {
    bj_name: string
    hearts: number
    percent: number
  }[]
  pattern_type: string
}

export interface AnalyticsSummary {
  total_hearts: number
  total_donations: number
  unique_donors: number
  unique_bjs: number
  avg_donation: number
  top_donor: string
  top_bj: string
}

// ==================== 새로운 타입: 회차별 추이 ====================

export interface EpisodeTrendData {
  episode_id: number
  episode_number: number
  title: string
  description: string | null
  broadcast_date: string
  is_rank_battle: boolean
  total_hearts: number
  donor_count: number
  avg_donation: number
  new_donors: number
  returning_donors: number
}

// ==================== 새로운 타입: 후원자 리텐션 ====================

export interface DonorRetentionData {
  // 시즌 참여 요약 (완결 시즌 기준 분류)
  seasonSummary: {
    total_donors: number
    returning_donors: number     // 2회+ 참여
    returning_rate: number       // %
    core_fans: number            // 60%+ 참여 (핵심 팬)
    regular_donors: number       // 4회~59% 참여 (단골)
    occasional_donors: number    // 2-3회 참여 (간헐)
    onetime_donors: number       // 1회만 참여 (1회성)
    avg_episodes: number         // 평균 참여 회차
    total_episodes: number       // 전체 확정 회차 수
    // 매출 지표
    total_hearts: number
    avg_hearts_per_episode: number
    core_fans_hearts: number
    core_fans_hearts_pct: number
    regular_hearts: number
    regular_hearts_pct: number
    occasional_hearts: number
    occasional_hearts_pct: number
    onetime_hearts: number
    onetime_hearts_pct: number
    top5_donors: { name: string; hearts: number }[]
    top5_hearts_pct: number       // 상위 5명 의존도
    top10_hearts_pct: number      // 상위 10명 의존도
    stable_revenue_ratio: number  // 단골+ 매출 비중 (안정적 매출)
    best_episode: { number: number; hearts: number }
    worst_episode: { number: number; hearts: number }
  }
  cohorts: {
    first_episode: number
    first_episode_title: string
    total_donors: number
    retention: { episode_number: number; retained: number; rate: number }[]
  }[]
  pareto: {
    top_percent: number
    hearts_percent: number
  }[]
  funnel: {
    label: string
    count: number
  }[]
  avgDonationTrend: { episode_number: number; avg_amount: number; median_amount: number }[]
  growthAccounting: {
    episode_number: number
    description: string | null
    is_rank_battle: boolean
    new_donors: number
    retained_donors: number
    resurrected_donors: number
    churned_donors: number
    new_hearts: number
    retained_hearts: number
    resurrected_hearts: number
    lost_hearts: number
    net_growth: number
  }[]
  insights: string[]
}

// ==================== 새로운 타입: BJ 상세 통계 ====================

export interface BjDonorDetail {
  donor_name: string
  total_hearts: number
  donation_count: number
  is_new: boolean
  trend: 'up' | 'down' | 'stable'
  episode_amounts: { episode_number: number; amount: number }[]
}

export interface BjGrowthMetrics {
  growth_rate: number           // 선형 회귀 기반 (% per episode)
  growth_direction: 'up' | 'down' | 'stable'
  consistency: number           // R² (0~100), 추세 일관성
  recent_momentum: number       // 최근 3화 vs 이전 3화 변화율
  episode_growth_line: { episode_number: number; actual: number; trend_line: number; description?: string | null }[]
  new_donor_flow: { episode_number: number; new_count: number; new_hearts: number; returning_count: number; returning_hearts: number }[]
  donor_acquisition_rate: number  // 회차당 평균 신규 후원자 수
  growth_from_new: number       // 신규 후원자 기여 하트 비중 (%)
  growth_from_existing: number  // 기존 후원자 증가분 비중 (%)
}

export interface BjDetailedStats extends BjStats {
  top_donors: BjDonorDetail[]
  new_donor_count: number
  notable_new_donors: string[]
  donor_concentration: {
    donor_name: string
    hearts: number
    percent: number
  }[]
  growth_metrics: BjGrowthMetrics | null
}

// ==================== 새로운 타입: 시간대 패턴 강화 ====================

export interface TimePatternEnhanced {
  overall: TimePatternData[]
  perBj: { bj_name: string; hours: { hour: number; hearts: number; count: number }[]; peak_hour: number }[]
  topDonorTimes: { donor_name: string; total_hearts: number; peak_hour: number; hours: { hour: number; hearts: number }[] }[]
  heatmap: { bj_name: string; hour: number; hearts: number; intensity: number }[]
}

// ==================== 새로운 타입: BJ 에피소드별 추이 ====================

export interface BjEpisodeTrendData {
  bj_name: string
  episodes: {
    episode_number: number
    hearts: number
    donor_count: number
  }[]
}

// ==================== 시그니처 자격 분석 ====================

export interface SignatureEligibilityData {
  episodeBreakdown: {
    episodeNumber: number
    episodeTitle: string
    isFinalized: boolean
    donors: {
      donorName: string
      totalAmount: number
      sigAwarded: number | null
      sigLabel: string
    }[]
  }[]
  summary: {
    sig3: { donorName: string; history: { ep: number; amount: number }[] }[]
    sig2: { donorName: string; history: { ep: number; amount: number }[] }[]
    sig1: { donorName: string; history: { ep: number; amount: number }[] }[]
    totalPeople: number
    totalSigs: number
  }
  unsynced: {
    donorName: string
    sigNumber: number
    episodeNumber: number
    amount: number
  }[]
}

// ==================== 대시보드 통계 ====================

export interface DashboardStatsData {
  totalMembers: number
  seasonDonorCount: number
  seasonTotalAmount: number
  totalDonorCount: number
  totalDonationAmount: number
  activeSeasons: number
  recentMembers: Array<{
    id: string
    nickname: string
    email: string
    createdAt: string
  }>
  totalPosts: number
  totalMedia: number
  totalSignatures: number
}

// ==================== Advanced Analytics 타입 ====================

// --- Churn Prediction ---

export interface ChurnPredictionEntry {
  donor_name: string
  total_hearts: number
  favorite_bj: string
  risk_score: number // 0-100
  risk_level: '위험' | '주의' | '관심' | '안전'
  signals: {
    frequency: number // 최근 불참 (0-35)
    gap: number // 부재 기간 (0-30)
    amount: number // 금액 추세 (0-20)
    rank_battle: number // 직급전 불참 (0-15)
  }
  recommendation: string
}

export interface ChurnPredictionData {
  entries: ChurnPredictionEntry[]
  summary: {
    danger_count: number
    warning_count: number
    watch_count: number
    safe_count: number
    total_at_risk_hearts: number
  }
}

// --- RFM Analysis ---

export interface RFMEntry {
  donor_name: string
  total_hearts: number
  recency: number // episodes since last donation
  frequency: number // participation rate %
  monetary: number // total hearts
  r_score: number // 1-5
  f_score: number // 1-5
  m_score: number // 1-5
  rfm_code: string // 'R5F4M3'
  segment: string // Korean segment name
  recommendation: string // Korean recommendation
}

export interface RFMData {
  entries: RFMEntry[]
  segmentSummary: {
    segment: string
    count: number
    total_hearts: number
    avg_recency: number
  }[]
}

// --- BJ Affinity Matrix ---

export interface BjAffinityEntry {
  bj_a: string
  bj_b: string
  shared_donors: number
  overlap_pct_a: number
  overlap_pct_b: number
  shared_hearts_a: number
  shared_hearts_b: number
  top_shared_donors: { name: string; hearts_a: number; hearts_b: number }[]
}

export interface BjExclusivity {
  bj_name: string
  total_donors: number
  exclusive_donors: number
  exclusive_pct: number
}

export interface BjAffinityData {
  matrix: BjAffinityEntry[]
  exclusivity: BjExclusivity[]
  insights: string[]
}

// --- BJ Actionable Insights ---

export interface BjInsightEntry {
  bj_name: string
  donor_health: {
    growing: number
    stable: number
    declining: number
    at_risk: number
  }
  rank_battle_effect: number // ratio: rank_battle_avg / regular_avg
  new_donor_retention_rate: number // % of new donors who returned 2+ times
  best_episode: { episode_number: number; hearts: number; description?: string | null } | null
  worst_episode: { episode_number: number; hearts: number; description?: string | null } | null
  actionable_insights: string[] // Korean recommendations, max 3
}

export interface BjInsightsData {
  global_retention_rate: number // 전체 평균 신규 후원자 정착률
  entries: BjInsightEntry[]
}
