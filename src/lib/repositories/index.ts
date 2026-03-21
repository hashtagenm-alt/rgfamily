/**
 * Repository Factory - Clean Architecture
 *
 * 데이터 접근 계층 추상화
 * - SupabaseDataProvider를 사용하여 데이터 접근
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { IDataProvider } from './types'
import { SupabaseDataProvider } from './supabase'

// Re-export types
export * from './types'
export { SupabaseDataProvider } from './supabase'

/**
 * Create DataProvider based on environment configuration
 *
 * @example
 * // In component or hook
 * const provider = createDataProvider(supabase)
 * const rankings = await provider.rankings.getRankings({})
 */
export function createDataProvider(
  supabase: SupabaseClient,
): IDataProvider {
  return new SupabaseDataProvider(supabase)
}
