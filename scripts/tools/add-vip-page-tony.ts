/**
 * ✨토니✨ VIP 개인페이지 열기
 *
 * 1. GIF 이미지를 Supabase Storage에 업로드 → avatar_url 설정
 * 2. signature_eligibility 테이블에 추가 → vip_clickable_profiles View에 포함
 * 3. vip_rewards rank 업데이트 (22 → 6)
 * 4. vip_images 추가 (시그니처 갤러리)
 * 5. 결과 검증
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

const PROFILE_ID = '07e2c39c-8629-4fd0-a684-b7d0d88de2cb'
const DONOR_NAME = '✨토니✨'
const BUCKET_NAME = 'vip-signatures'
const VIP_REWARD_ID = 72
const IMAGE_PATH = '/Users/bagjaeseog/Downloads/a0ea90d6-5390-4be0-aa51-92e86c04afa1.gif'

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🎯 ${DONOR_NAME} VIP 개인페이지 열기`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 1. 아바타 이미지 업로드
  console.log('📤 [1/5] 아바타 이미지 업로드...')

  if (!fs.existsSync(IMAGE_PATH)) {
    throw new Error(`파일을 찾을 수 없습니다: ${IMAGE_PATH}`)
  }

  const fileBuffer = fs.readFileSync(IMAGE_PATH)
  const fileName = `tony-10052-${Date.now()}.gif`

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

  // 2. 프로필 avatar_url 업데이트
  console.log('👤 [2/5] 프로필 avatar_url 업데이트...')

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', PROFILE_ID)

  if (profileError) {
    throw new Error(`프로필 업데이트 실패: ${profileError.message}`)
  }
  console.log('   ✅ 프로필 avatar_url 업데이트 완료')
  console.log('')

  // 3. signature_eligibility 추가
  console.log('💎 [3/5] signature_eligibility 추가...')

  const { error: sigError } = await supabase
    .from('signature_eligibility')
    .upsert(
      {
        profile_id: PROFILE_ID,
        donor_name: DONOR_NAME,
        sig_number: 1,
        daily_amount: 100000,
        threshold_amount: 100000,
        notes: '✨토니✨ VIP 개인페이지 개설',
      },
      { onConflict: 'donor_name,sig_number' }
    )

  if (sigError) {
    throw new Error(`signature_eligibility 추가 실패: ${sigError.message}`)
  }
  console.log('   ✅ signature_eligibility 추가 완료')
  console.log('')

  // 4. vip_rewards rank 업데이트 (22 → 6)
  console.log('🏆 [4/5] vip_rewards rank 업데이트 (22 → 6)...')

  const { error: rankError } = await supabase
    .from('vip_rewards')
    .update({ rank: 6 })
    .eq('id', VIP_REWARD_ID)

  if (rankError) {
    throw new Error(`vip_rewards rank 업데이트 실패: ${rankError.message}`)
  }
  console.log('   ✅ vip_rewards rank 업데이트 완료')
  console.log('')

  // 5. vip_images 추가 (시그니처 갤러리)
  console.log('🖼️ [5/5] vip_images 추가 (시그니처 갤러리)...')

  const { error: imgError } = await supabase
    .from('vip_images')
    .insert({
      reward_id: VIP_REWARD_ID,
      image_url: avatarUrl,
      order_index: 0,
    })

  if (imgError) {
    throw new Error(`vip_images 추가 실패: ${imgError.message}`)
  }
  console.log('   ✅ vip_images 추가 완료')
  console.log('')

  // 검증
  console.log('🔍 검증 중...')

  const { data: vcp, error: vcpError } = await supabase
    .from('vip_clickable_profiles')
    .select('*')
    .eq('profile_id', PROFILE_ID)
    .maybeSingle()

  if (vcpError) {
    console.log(`   ⚠️ View 조회 오류: ${vcpError.message}`)
  } else if (vcp) {
    console.log('   ✅ vip_clickable_profiles에 포함됨!')
    console.log(`      - nickname: ${(vcp as any).nickname}`)
    console.log(`      - avatar: ${(vcp as any).avatar_url ? 'YES' : 'NO'}`)
    console.log(`      - clickable: ${(vcp as any).is_vip_clickable}`)
  } else {
    console.log('   ❌ vip_clickable_profiles에 포함되지 않음')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, avatar_url, role')
    .eq('id', PROFILE_ID)
    .single()

  console.log(`   프로필: ${profile?.nickname} | avatar: ${profile?.avatar_url ? 'YES' : 'NO'} | role: ${profile?.role}`)

  const { data: reward } = await supabase
    .from('vip_rewards')
    .select('id, rank')
    .eq('id', VIP_REWARD_ID)
    .single()

  console.log(`   vip_rewards: id=${reward?.id} | rank=${reward?.rank}`)

  const { data: images } = await supabase
    .from('vip_images')
    .select('id, image_url, order_index')
    .eq('reward_id', VIP_REWARD_ID)

  console.log(`   vip_images: ${images?.length ?? 0}개`)

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
