import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { USE_MOCK_DATA, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config'

/**
 * Mock Supabase 서버 프록시
 * Supabase 자격 증명이 없을 때 빈 응답을 반환
 */
function createMockServerProxy(): SupabaseClient<Database> {
  const emptyResponse = { data: null, error: null }
  const emptyArrayResponse = { data: [], error: null }

  const queryBuilder = {
    select: () => queryBuilder,
    insert: () => queryBuilder,
    update: () => queryBuilder,
    upsert: () => queryBuilder,
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

  return {
    from: () => queryBuilder,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
  } as unknown as SupabaseClient<Database>
}

export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  // Mock 모드이거나 Supabase 자격 증명이 없으면 Mock 프록시 반환
  if (USE_MOCK_DATA || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return createMockServerProxy()
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component에서는 쿠키를 설정할 수 없음
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Server Component에서는 쿠키를 삭제할 수 없음
          }
        },
      },
    }
  )
}
