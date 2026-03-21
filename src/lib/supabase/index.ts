/**
 * Supabase Client Module
 *
 * 용도별 import:
 * - 클라이언트 컴포넌트: createClient, getSupabaseClient
 * - 서버 액션/RSC: createServerSupabaseClient
 * - 관리자 스크립트: createServiceRoleClient
 * - 미들웨어: updateSession
 */

// Browser client
export {
  createClient,
  getSupabaseClient,
  resetSupabaseClient,
  hasSupabaseClient,
} from './client'

// Server client
export {
  createServerSupabaseClient,
  createServiceRoleClient,
} from './server'

// Middleware
export { updateSession } from './middleware'
