'use server'

import type { Database } from '@/types/database'
import { adminAction, type ActionResult } from './index'

type TableName = keyof Database['public']['Tables']

// useAdminCRUD 훅이 접근할 수 있는 화이트리스트 테이블
const ALLOWED_TABLES = [
  'seasons', 'episodes', 'notices', 'organization',
  'media_content', 'profiles', 'schedules', 'signatures',
  'vip_rewards', 'banners', 'timeline_events',
  'signature_videos', 'posts', 'comments',
  'live_status', 'bj_thank_you_messages',
] as const

type AllowedTable = typeof ALLOWED_TABLES[number]

function validateTable(tableName: string): asserts tableName is AllowedTable {
  if (!ALLOWED_TABLES.includes(tableName as AllowedTable)) {
    throw new Error(`허용되지 않은 테이블: ${tableName}`)
  }
}

/** DB 에러를 구조화된 JSON 문자열로 변환 (클라이언트에서 파싱 가능) */
function throwStructuredError(error: { message?: string; code?: string; details?: string; hint?: string }): never {
  throw new Error(JSON.stringify({
    message: error.message || '알 수 없는 오류',
    code: error.code || null,
    details: error.details || null,
    hint: error.hint || null,
  }))
}

export interface AdminFetchOptions {
  select?: string
  orderBy?: { column: string; ascending?: boolean; nullsFirst?: boolean }[]
}

export async function adminFetchItems(
  tableName: string,
  options: AdminFetchOptions = {}
): Promise<ActionResult<Record<string, unknown>[]>> {
  return adminAction(async (supabase) => {
    validateTable(tableName)
    let query = supabase.from(tableName as TableName).select(options.select || '*') as unknown as ReturnType<ReturnType<typeof supabase.from>['select']>

    if (options.orderBy) {
      for (const ob of options.orderBy) {
        query = query.order(ob.column, {
          ascending: ob.ascending ?? true,
          nullsFirst: ob.nullsFirst ?? false,
        })
      }
    }

    const { data, error } = await query
    if (error) throwStructuredError(error)
    return (data || []) as Record<string, unknown>[]
  })
}

export async function adminCreateItem(
  tableName: string,
  data: Record<string, unknown>
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    validateTable(tableName)
    const { error } = await supabase.from(tableName as TableName).insert(data as never)
    if (error) throwStructuredError(error)
    return null
  })
}

export async function adminUpdateItem(
  tableName: string,
  id: number | string,
  data: Record<string, unknown>
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    validateTable(tableName)
    const { error } = await supabase.from(tableName as TableName).update(data as never).eq('id' as never, id)
    if (error) throwStructuredError(error)
    return null
  })
}

export async function adminDeleteItem(
  tableName: string,
  id: number | string
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    validateTable(tableName)
    const { error } = await supabase.from(tableName as TableName).delete().eq('id' as never, id)
    if (error) throwStructuredError(error)
    return null
  })
}
