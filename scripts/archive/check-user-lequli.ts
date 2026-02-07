/**
 * 르큐리 계정 정보 확인
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = getServiceClient()

async function main() {
  const profileId = '30cf13d0-50bf-40e7-be20-6e4f50b38446'

  console.log('=== 르큐리 계정 정보 확인 ===\n')

  // 1. 프로필 정보
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  console.log('프로필 정보:')
  console.log(profile)

  // 2. Auth 사용자 정보
  console.log('\nAuth 사용자 정보:')
  const { data: authUser, error } = await supabase.auth.admin.getUserById(profileId)

  if (error) {
    console.log('Auth 사용자 없음:', error.message)
  } else {
    console.log('이메일:', authUser.user.email)
    console.log('이메일 확인:', authUser.user.email_confirmed_at ? '완료' : '미완료')
    console.log('생성일:', authUser.user.created_at)
    console.log('마지막 로그인:', authUser.user.last_sign_in_at || '없음')
  }
}

main().catch(console.error)
