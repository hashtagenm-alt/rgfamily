/**
 * 공통 유틸리티 함수
 *
 * - withRetry: 지수 백오프 재시도 로직
 * - processBatch: 배치 처리 + 진행률 + 재시도
 * - sleep: 대기 함수
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  onRetry?: (error: Error, attempt: number, delayMs: number) => void
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
}

/**
 * 대기 함수
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 지수 백오프 재시도 로직
 *
 * @example
 * const result = await withRetry(
 *   () => supabase.from('table').select('*'),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * )
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
  } = { ...DEFAULT_RETRY_OPTIONS, ...options }

  let lastError: Error | null = null
  let delayMs = initialDelayMs

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt > maxRetries) {
        break
      }

      options.onRetry?.(lastError, attempt, delayMs)

      await sleep(delayMs)
      delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs)
    }
  }

  throw lastError
}

export interface BatchOptions<T> extends RetryOptions {
  batchSize?: number
  onProgress?: (processed: number, total: number, item: T) => void
  onBatchComplete?: (batchIndex: number, results: unknown[]) => void
}

/**
 * 배치 처리 + 진행률 + 재시도
 *
 * @example
 * await processBatch(
 *   rankings,
 *   async (ranking) => {
 *     await supabase.from('rankings').upsert(ranking)
 *   },
 *   {
 *     batchSize: 100,
 *     onProgress: (processed, total) => {
 *       console.log(`Progress: ${processed}/${total}`)
 *     }
 *   }
 * )
 */
export async function processBatch<T, R = unknown>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions<T> = {}
): Promise<R[]> {
  const { batchSize = 50, onProgress, onBatchComplete, ...retryOptions } = options
  const results: R[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults: R[] = []

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j]
      const globalIndex = i + j

      const result = await withRetry(
        () => processor(item, globalIndex),
        {
          ...retryOptions,
          onRetry: (error, attempt, delayMs) => {
            console.warn(
              `⚠️  재시도 ${attempt}/${retryOptions.maxRetries || 3}: ` +
              `항목 ${globalIndex + 1}/${items.length} - ${error.message} ` +
              `(${delayMs}ms 대기)`
            )
            retryOptions.onRetry?.(error, attempt, delayMs)
          },
        }
      )

      batchResults.push(result)
      onProgress?.(globalIndex + 1, items.length, item)
    }

    results.push(...batchResults)
    onBatchComplete?.(Math.floor(i / batchSize), batchResults)
  }

  return results
}

/**
 * 배열을 청크로 분할
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * 진행률 바 출력 (터미널용)
 */
export function printProgress(
  current: number,
  total: number,
  label: string = ''
): void {
  const percentage = Math.round((current / total) * 100)
  const barLength = 30
  const filledLength = Math.round((current / total) * barLength)
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)

  process.stdout.write(`\r${label}[${bar}] ${current}/${total} (${percentage}%)`)

  if (current === total) {
    process.stdout.write('\n')
  }
}
