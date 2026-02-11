/**
 * 신세련❤️영원한니꺼✦쿨 VIP 개인페이지 열기
 *
 * 1. 11280 이미지를 Supabase Storage에 업로드 → avatar_url 설정
 * 2. signature_eligibility 테이블에 추가 → vip_clickable_profiles View에 포함
 * 3. 결과 검증
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

const PROFILE_ID = '74094634-4af7-45a0-8c03-5c03122b2a86'
const DONOR_NAME = '신세련❤️영원한니꺼✦쿨'
const BUCKET_NAME = 'vip-signatures'

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🎯 ${DONOR_NAME} VIP 개인페이지 열기`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 1. 아바타 이미지 업로드
  console.log('📤 [1/3] 아바타 이미지 업로드...')
  const filePath = path.join(__dirname, 'thumbnails', 'sig-11280.gif')

  if (!fs.existsSync(filePath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${filePath}`)
  }

  const fileBuffer = fs.readFileSync(filePath)
  const fileName = `sinseryeon-11280-${Date.now()}.gif`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, fileBuffer, {
      contentType: 'image/gif',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`업로드 실패: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)

  const avatarUrl = urlData.publicUrl
  console.log(`   ✅ 업로드 완료: ${avatarUrl}`)

  // 프로필 avatar_url 업데이트
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', PROFILE_ID)

  if (profileError) {
    throw new Error(`프로필 업데이트 실패: ${profileError.message}`)
  }
  console.log('   ✅ 프로필 avatar_url 업데이트 완료')
  console.log('')

  // 2. signature_eligibility 추가
  console.log('💎 [2/3] signature_eligibility 추가...')

  const { error: sigError } = await supabase
    .from('signature_eligibility')
    .upsert(
      {
        profile_id: PROFILE_ID,
        donor_name: DONOR_NAME,
        sig_number: 1,
        daily_amount: 100000,
        threshold_amount: 100000,
        notes: '신세련❤️영원한니꺼✦쿨 VIP 개인페이지 개설',
      },
      { onConflict: 'donor_name,sig_number' }
    )

  if (sigError) {
    throw new Error(`signature_eligibility 추가 실패: ${sigError.message}`)
  }
  console.log('   ✅ signature_eligibility 추가 완료')
  console.log('')

  // 3. 검증
  console.log('🔍 [3/3] 검증...')

  const { data: vcp, error: vcpError } = await supabase
    .from('vip_clickable_profiles')
    .select('*')
    .eq('profile_id', PROFILE_ID)
    .maybeSingle()

  if (vcpError) {
    console.log(`   ⚠️ View 조회 오류: ${vcpError.message}`)
  } else if (vcp) {
    console.log('   ✅ vip_clickable_profiles에 포함됨!')
    console.log(`      - nickname: ${vcp.nickname}`)
    console.log(`      - avatar: ${vcp.avatar_url ? 'YES' : 'NO'}`)
    console.log(`      - clickable: ${vcp.is_vip_clickable}`)
  } else {
    console.log('   ❌ vip_clickable_profiles에 포함되지 않음')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, avatar_url, role')
    .eq('id', PROFILE_ID)
    .single()

  console.log(`   프로필: ${profile?.nickname} | avatar: ${profile?.avatar_url ? 'YES' : 'NO'} | role: ${profile?.role}`)

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 모든 작업 완료!')
  console.log(`🔗 개인페이지: /ranking/vip/${PROFILE_ID}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
