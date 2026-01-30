/**
 * 퀸로니 PandaTV 채널 ID 수정 스크립트
 *
 * queenroni -> tjdrks1771
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdiptfmagemjfmsuphaj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function updateQueenroni() {
  console.log('퀸로니 PandaTV 채널 ID 업데이트 시작...')

  // 퀸로니 찾기
  const { data: member, error: findError } = await supabase
    .from('organization')
    .select('id, name, social_links')
    .ilike('name', '%퀸로니%')
    .single()

  if (findError) {
    console.log('퀸로니 조회 실패:', findError.message)
    return
  }

  console.log('현재 퀸로니 정보:', JSON.stringify(member, null, 2))

  // social_links 업데이트
  const currentLinks = (member.social_links || {}) as Record<string, string>
  const newSocialLinks = { ...currentLinks, pandatv: 'tjdrks1771' }

  console.log('새 social_links:', JSON.stringify(newSocialLinks, null, 2))

  const { data, error } = await supabase
    .from('organization')
    .update({ social_links: newSocialLinks })
    .eq('id', member.id)
    .select()

  if (error) {
    console.log('업데이트 실패:', error.message)
  } else {
    console.log('✅ 업데이트 성공:', JSON.stringify(data, null, 2))
  }
}

updateQueenroni()
