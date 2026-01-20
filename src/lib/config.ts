/**
 * 중앙화된 환경 설정
 * 모든 환경 변수 및 기능 플래그를 여기서 관리
 */

// Supabase 자격 증명 유효성 (선행 정의)
const hasSupabaseCredentials = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Mock 데이터 사용 여부
// - NEXT_PUBLIC_USE_MOCK_DATA=true 로 명시했을 때만 mock 사용
// - Supabase 자격 증명이 없으면 자동으로 Mock 모드 활성화
export const USE_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' ||
  !hasSupabaseCredentials

// Supabase 설정
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Supabase 자격 증명이 유효한지 확인
export const hasValidSupabaseCredentials = hasSupabaseCredentials

// 앱 설정
export const APP_CONFIG = {
  name: 'RG Family',
  description: 'RG FAMILY 공식 사이트',
  platform: 'pandatv',
  units: {
    excel: { name: '엑셀부', label: 'EXCEL UNIT', country: '한국' },
    crew: { name: '크루부', label: 'CREW UNIT', country: '중국' },
  },
  donation: {
    unit: '하트',
    unitSymbol: '♥',
  },
  vip: {
    threshold: 50, // VIP 자격 순위 (1~50위)
    topRankerThreshold: 3, // 탑 랭커 순위 (1~3위)
  },
} as const

// 페이지네이션 기본값
export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const
