/**
 * PandaTV API Module
 *
 * 통합 모듈(pandatv-unified)을 기본으로 사용하세요.
 * 개별 모듈은 특정 방식만 필요할 때 직접 import하세요.
 */

// 통합 모듈 (API + Scraper fallback) - 권장
export {
  checkChannelLiveStatus,
  checkMultipleChannels,
  getAllLiveBJs,
  getStatus,
  resetStatus,
  extractChannelId,
  type PandaTVLiveStatus,
} from './pandatv-unified'

// 개별 모듈은 필요 시 직접 import:
// import { ... } from '@/lib/api/pandatv'
// import { ... } from '@/lib/api/pandatv-scraper'
