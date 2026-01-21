/**
 * PandaTV 라이브 상태 확인 - 통합 모듈 (Fallback 패턴)
 *
 * 동작 방식:
 * 1. API 방식 시도 (기본)
 * 2. API 실패 시 스크래퍼 방식으로 자동 전환
 *
 * 사용법:
 * import { checkChannelLiveStatus, checkMultipleChannels } from '@/lib/api/pandatv-unified'
 */

import * as api from './pandatv'
import * as scraper from './pandatv-scraper'

export interface PandaTVLiveStatus {
  channelId: string
  isLive: boolean
  title?: string
  viewerCount?: number
  thumbnailUrl?: string
  userNick?: string
  error?: string
  source?: 'api' | 'scraper' // 어떤 방식으로 가져왔는지
}

// 마지막 성공한 방식 기억 (다음 요청에 우선 시도)
let lastSuccessfulMethod: 'api' | 'scraper' = 'api'

// API 연속 실패 카운트 (3번 연속 실패 시 스크래퍼 우선)
let apiFailCount = 0
const API_FAIL_THRESHOLD = 3

// 스크래퍼 연속 실패 카운트
let scraperFailCount = 0
const SCRAPER_FAIL_THRESHOLD = 3

/**
 * API 방식 시도
 */
async function tryApiMethod(channelId: string): Promise<PandaTVLiveStatus | null> {
  try {
    const result = await api.checkChannelLiveStatus(channelId)

    // 에러가 있으면 실패로 간주
    if (result.error) {
      apiFailCount++
      console.warn(`[PandaTV] API 방식 실패 (${apiFailCount}회): ${result.error}`)
      return null
    }

    // 성공
    apiFailCount = 0
    lastSuccessfulMethod = 'api'
    return { ...result, source: 'api' }
  } catch (error) {
    apiFailCount++
    console.warn(`[PandaTV] API 방식 예외 (${apiFailCount}회):`, error)
    return null
  }
}

/**
 * 스크래퍼 방식 시도
 */
async function tryScraperMethod(channelId: string): Promise<PandaTVLiveStatus | null> {
  try {
    const result = await scraper.checkChannelLiveStatusScraper(channelId)

    // 에러가 있으면 실패로 간주
    if (result.error) {
      scraperFailCount++
      console.warn(`[PandaTV] 스크래퍼 방식 실패 (${scraperFailCount}회): ${result.error}`)
      return null
    }

    // 성공
    scraperFailCount = 0
    lastSuccessfulMethod = 'scraper'
    return { ...result, source: 'scraper' }
  } catch (error) {
    scraperFailCount++
    console.warn(`[PandaTV] 스크래퍼 방식 예외 (${scraperFailCount}회):`, error)
    return null
  }
}

/**
 * 단일 채널 라이브 상태 확인 (Fallback 적용)
 */
export async function checkChannelLiveStatus(channelId: string): Promise<PandaTVLiveStatus> {
  // 어떤 방식을 먼저 시도할지 결정
  const shouldTryApiFirst = apiFailCount < API_FAIL_THRESHOLD
  const shouldTryScraperFirst = scraperFailCount < SCRAPER_FAIL_THRESHOLD && !shouldTryApiFirst

  let result: PandaTVLiveStatus | null = null

  if (shouldTryApiFirst || lastSuccessfulMethod === 'api') {
    // API 먼저 시도
    result = await tryApiMethod(channelId)

    if (!result) {
      // API 실패 → 스크래퍼로 fallback
      console.log(`[PandaTV] API 실패, 스크래퍼로 전환...`)
      result = await tryScraperMethod(channelId)
    }
  } else if (shouldTryScraperFirst || lastSuccessfulMethod === 'scraper') {
    // 스크래퍼 먼저 시도
    result = await tryScraperMethod(channelId)

    if (!result) {
      // 스크래퍼 실패 → API로 fallback
      console.log(`[PandaTV] 스크래퍼 실패, API로 전환...`)
      result = await tryApiMethod(channelId)
    }
  }

  // 둘 다 실패한 경우
  if (!result) {
    console.error(`[PandaTV] 모든 방식 실패: ${channelId}`)
    return {
      channelId,
      isLive: false,
      error: 'API와 스크래퍼 모두 실패',
      source: 'api',
    }
  }

  return result
}

/**
 * 여러 채널 라이브 상태 확인 (Fallback 적용)
 */
export async function checkMultipleChannels(
  channelIds: string[],
  _concurrency?: number
): Promise<PandaTVLiveStatus[]> {
  // API 방식이 가능한 상태라면 API 사용 (효율적)
  if (apiFailCount < API_FAIL_THRESHOLD) {
    try {
      const results = await api.checkMultipleChannels(channelIds, _concurrency)

      // 에러 없이 결과가 왔으면 성공
      const hasError = results.some(r => r.error)
      if (!hasError) {
        apiFailCount = 0
        lastSuccessfulMethod = 'api'
        return results.map(r => ({ ...r, source: 'api' as const }))
      }
    } catch (error) {
      apiFailCount++
      console.warn(`[PandaTV] API 다중 조회 실패:`, error)
    }
  }

  // API 실패 시 스크래퍼로 개별 조회 (느리지만 백업)
  console.log(`[PandaTV] API 실패, 스크래퍼로 개별 조회 시작...`)

  const results: PandaTVLiveStatus[] = []
  for (const channelId of channelIds) {
    const result = await checkChannelLiveStatus(channelId)
    results.push(result)
  }

  return results
}

/**
 * 현재 라이브 중인 모든 BJ 목록 (API만 지원)
 */
export async function getAllLiveBJs(): Promise<PandaTVLiveStatus[]> {
  // API 방식 시도
  if (apiFailCount < API_FAIL_THRESHOLD) {
    try {
      const results = await api.getAllLiveBJs()
      if (results.length > 0 || apiFailCount === 0) {
        apiFailCount = 0
        lastSuccessfulMethod = 'api'
        return results.map(r => ({ ...r, source: 'api' as const }))
      }
    } catch (error) {
      apiFailCount++
      console.warn(`[PandaTV] API 전체 목록 조회 실패:`, error)
    }
  }

  // 스크래퍼로 라이브 목록 페이지 시도
  console.log(`[PandaTV] API 실패, 스크래퍼로 라이브 목록 조회...`)
  try {
    const results = await scraper.scrapeLiveListPage()
    if (results.length > 0) {
      scraperFailCount = 0
      lastSuccessfulMethod = 'scraper'
      return results.map(r => ({ ...r, source: 'scraper' as const }))
    }
  } catch (error) {
    scraperFailCount++
    console.warn(`[PandaTV] 스크래퍼 전체 목록 조회 실패:`, error)
  }

  console.error(`[PandaTV] 모든 방식으로 라이브 목록 조회 실패`)
  return []
}

/**
 * 현재 상태 정보 반환 (디버깅용)
 */
export function getStatus() {
  return {
    lastSuccessfulMethod,
    apiFailCount,
    scraperFailCount,
    apiAvailable: apiFailCount < API_FAIL_THRESHOLD,
    scraperAvailable: scraperFailCount < SCRAPER_FAIL_THRESHOLD,
  }
}

/**
 * 상태 초기화 (테스트용)
 */
export function resetStatus() {
  lastSuccessfulMethod = 'api'
  apiFailCount = 0
  scraperFailCount = 0
}

// Re-export utility functions
export { extractChannelId } from './pandatv'
