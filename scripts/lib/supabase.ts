/**
 * 공통 Supabase 클라이언트 및 환경변수 검증
 *
 * 스크립트용 Service Role 클라이언트를 제공합니다.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import type { Database } from '../../src/types/database'

// 프로젝트 루트의 .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export interface EnvConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey: string
}

/**
 * 환경변수 검증 및 반환
 * @throws 필수 환경변수가 없으면 에러
 */
export function validateEnv(): EnvConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing: string[] = []

  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    console.error('❌ 다음 환경변수가 설정되지 않았습니다:')
    for (const env of missing) {
      console.error(`   - ${env}`)
    }
    console.error('\n💡 .env.local 파일을 확인하세요.')
    process.exit(1)
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
    supabaseServiceKey: supabaseServiceKey!,
  }
}

let serviceClient: SupabaseClient<Database> | null = null

/**
 * Service Role 클라이언트 (싱글톤)
 * RLS를 우회하여 관리자 권한으로 DB 접근
 */
export function getServiceClient(): SupabaseClient<Database> {
  if (serviceClient) return serviceClient

  const { supabaseUrl, supabaseServiceKey } = validateEnv()

  serviceClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return serviceClient
}

/**
 * 익명 클라이언트 (일반 사용자 권한)
 * RLS 적용됨
 */
export function getAnonClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseAnonKey } = validateEnv()

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Supabase 쿼리 결과 에러 체크
 * @throws 에러가 있으면 예외 발생
 */
export function checkError<T>(
  result: { data: T | null; error: { message: string; code?: string } | null },
  context: string = ''
): T {
  if (result.error) {
    const prefix = context ? `[${context}] ` : ''
    throw new Error(`${prefix}${result.error.message}`)
  }
  return result.data as T
}

/**
 * 테이블 존재 여부 확인
 */
export async function tableExists(
  client: SupabaseClient<Database>,
  tableName: string
): Promise<boolean> {
  const { data, error } = await client
    .from('information_schema.tables' as any)
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .single()

  return !error && data !== null
}

/**
 * RPC 함수 존재 여부 확인
 */
export async function rpcExists(
  client: SupabaseClient<Database>,
  functionName: string
): Promise<boolean> {
  const { data, error } = await client
    .rpc('pg_proc_exists' as any, { func_name: functionName })

  // 함수가 없으면 rpc 자체가 실패할 수 있음
  if (error) {
    // 대안: information_schema에서 확인
    const { data: procData } = await client
      .from('information_schema.routines' as any)
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', functionName)
      .single()

    return procData !== null
  }

  return data === true
}
