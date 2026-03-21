import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config'

/**
 * Mock Supabase 프록시
 * Supabase 자격 증명이 없을 때 빈 응답을 반환하는 프록시 객체
 */
function createMockSupabaseProxy(): SupabaseClient<Database> {
  const emptyResponse = { data: null, error: null }
  const emptyArrayResponse = { data: [], error: null }

  const queryBuilder = {
    select: () => queryBuilder,
    insert: () => Promise.resolve(emptyResponse),
    update: () => queryBuilder,
    delete: () => queryBuilder,
    eq: () => queryBuilder,
    neq: () => queryBuilder,
    gt: () => queryBuilder,
    gte: () => queryBuilder,
    lt: () => queryBuilder,
    lte: () => queryBuilder,
    like: () => queryBuilder,
    ilike: () => queryBuilder,
    is: () => queryBuilder,
    in: () => queryBuilder,
    contains: () => queryBuilder,
    containedBy: () => queryBuilder,
    order: () => queryBuilder,
    limit: () => queryBuilder,
    range: () => queryBuilder,
    single: () => Promise.resolve(emptyResponse),
    maybeSingle: () => Promise.resolve(emptyResponse),
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      Promise.resolve(emptyArrayResponse).then(resolve),
  }

  const mockChannel = {
    on: () => mockChannel,
    subscribe: () => mockChannel,
    unsubscribe: () => Promise.resolve('ok'),
  }

  return {
    from: () => queryBuilder,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    channel: () => mockChannel,
    removeChannel: () => Promise.resolve('ok'),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
      }),
    },
  } as unknown as SupabaseClient<Database>
}

export function createClient(): SupabaseClient<Database> {
  // Supabase 자격 증명이 없으면 빈 프록시 반환 (CI 환경 등)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return createMockSupabaseProxy()
  }

  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}

// Singleton instance for client-side usage
let client: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    client = createClient()
  }
  return client
}

/**
 * Supabase 클라이언트 리셋
 * 메모리 해제 또는 인증 상태 초기화 시 사용
 *
 * 사용 사례:
 * - 로그아웃 시 클라이언트 상태 초기화
 * - 메모리 누수 방지를 위한 명시적 정리
 * - 테스트 환경에서 클라이언트 재생성
 */
export function resetSupabaseClient(): void {
  if (client) {
    // 모든 실시간 구독 정리
    client.removeAllChannels?.()
    client = null
  }
}

/**
 * Supabase 클라이언트 존재 여부 확인
 * 디버깅 또는 상태 확인 용도
 */
export function hasSupabaseClient(): boolean {
  return client !== null
}
