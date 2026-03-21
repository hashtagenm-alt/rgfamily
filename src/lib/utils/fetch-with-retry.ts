/**
 * Fetch with Timeout and Retry
 *
 * Supabase 연결 문제 해결을 위한 유틸리티
 * - 타임아웃 설정 (기본 10초)
 * - 자동 재시도 (기본 3회, 지수 백오프)
 * - 연결 에러 핸들링
 */

import { logger } from '@/lib/utils/logger'

export interface FetchWithRetryOptions {
  /** 타임아웃 (ms) - 기본 10초 */
  timeout?: number
  /** 최대 재시도 횟수 - 기본 3회 */
  maxRetries?: number
  /** 초기 대기 시간 (ms) - 기본 1초 */
  initialDelay?: number
  /** 재시도 가능한 에러인지 판단 */
  isRetryable?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<FetchWithRetryOptions> = {
  timeout: 10000,
  maxRetries: 3,
  initialDelay: 1000,
  isRetryable: (error) => {
    // 네트워크 에러, 타임아웃, 5xx 에러는 재시도
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('connection') ||
        message.includes('aborted')
      )
    }
    return false
  },
}

/**
 * Promise에 타임아웃 적용
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)

    promise
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/**
 * 지수 백오프로 대기
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 재시도 로직이 포함된 비동기 함수 실행
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await withTimeout(fn(), opts.timeout)
      return result
    } catch (error) {
      lastError = error

      // 마지막 시도이거나 재시도 불가능한 에러면 throw
      if (attempt === opts.maxRetries || !opts.isRetryable(error)) {
        throw error
      }

      // 지수 백오프 대기
      const delay = opts.initialDelay * Math.pow(2, attempt)
      logger.warn(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${delay}ms...`,
        { context: { error: error instanceof Error ? error.message : error } }
      )
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Supabase 쿼리용 래퍼
 *
 * @example
 * const { data, error } = await queryWithRetry(() =>
 *   supabase.from('table').select('*')
 * )
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  options: FetchWithRetryOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const result = await withRetry(queryFn, options)
    return result
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}
