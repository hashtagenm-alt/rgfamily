/**
 * 미키™ 프로필 중복 해결 및 시그니처 등록
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

const SIGNATURE_FILE = '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/rg 리뉴얼 시그 최종/RG리뉴얼시그 등록용/12412 3mb.gif'

async function main() {
  console.log('=== 미키™ 프로필 중복 해결 및 시그니처 등록 ===\n')

  // 1. 미키 프로필 2개 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .ilike('nickname', '%미키%')

  console.log('현재 미키 프로필 목록:')
  profiles?.forEach(p => {
    console.log(`  - ID: ${p.id}`)
    console.log(`    이메일: ${p.email}`)
    console.log(`    아바타: ${p.avatar_url ? '있음' : '없음'}`)
    console.log('')
  })

  // 아바타가 있는 프로필(기존)과 없는 프로필(새로 생성) 구분
  const originalProfile = profiles?.find(p => p.avatar_url)
  const duplicateProfile = profiles?.find(p => !p.avatar_url)

  if (!originalProfile) {
    console.log('기존 프로필을 찾을 수 없습니다.')
    return
  }

  console.log(`기존 프로필 ID: ${originalProfile.id}`)
  console.log(`기존 프로필 이메일: ${originalProfile.email}`)

  if (duplicateProfile) {
    console.log(`\n중복 프로필 ID: ${duplicateProfile.id}`)
    console.log(`중복 프로필 이메일: ${duplicateProfile.email}`)

    // 2. 중복 프로필의 auth 계정 삭제
    console.log('\n1. 중복 auth 계정 삭제...')
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(duplicateProfile.id)
    if (authDeleteError) {
      console.log(`  Auth 삭제 에러: ${authDeleteError.message}`)
    } else {
      console.log('  Auth 계정 삭제 완료')
    }

    // 3. 중복 프로필 레코드 삭제
    console.log('\n2. 중복 프로필 레코드 삭제...')
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', duplicateProfile.id)

    if (profileDeleteError) {
      console.log(`  프로필 삭제 에러: ${profileDeleteError.message}`)
    } else {
      console.log('  프로필 레코드 삭제 완료')
    }
  }

  // 4. 기존 프로필의 이메일과 비밀번호 업데이트
  console.log('\n3. 기존 프로필 이메일/비밀번호 업데이트...')
  const newEmail = 'vip002@rgfamily.kr'
  const newPassword = 'MikiVIP2024!@'

  const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
    originalProfile.id,
    {
      email: newEmail,
      password: newPassword,
      email_confirm: true
    }
  )

  if (updateAuthError) {
    console.log(`  Auth 업데이트 에러: ${updateAuthError.message}`)
  } else {
    console.log(`  이메일 변경: ${originalProfile.email} → ${newEmail}`)
    console.log(`  비밀번호 설정: ${newPassword}`)
  }

  // 프로필 테이블도 업데이트
  await supabase
    .from('profiles')
    .update({ email: newEmail })
    .eq('id', originalProfile.id)

  // 5. vip_rewards에서 미키의 rank 확인 및 수정 (rank 2여야 함)
  console.log('\n4. VIP Rewards 확인...')
  const { data: vipReward } = await supabase
    .from('vip_rewards')
    .select('*')
    .eq('profile_id', originalProfile.id)
    .single()

  if (vipReward) {
    console.log(`  현재 rank: ${vipReward.rank}`)
    if (vipReward.rank !== 2) {
      // rank 2로 수정
      await supabase
        .from('vip_rewards')
        .update({ rank: 2 })
        .eq('id', vipReward.id)
      console.log('  → rank 2로 수정 완료')
    }
  } else {
    // vip_rewards 생성
    console.log('  VIP Rewards 레코드가 없습니다. 생성합니다...')
    await supabase
      .from('vip_rewards')
      .insert({
        profile_id: originalProfile.id,
        season_id: 1,
        rank: 2,
        episode_id: 12
      })
    console.log('  VIP Rewards 생성 완료 (rank: 2)')
  }

  // 6. 시그니처 GIF 파일 업로드
  console.log('\n5. 시그니처 파일 업로드...')

  // 파일 읽기
  const fileBuffer = fs.readFileSync(SIGNATURE_FILE)
  const fileName = `miki-signature-1.gif`
  const storagePath = `signatures/${fileName}`

  // vip-signatures 버킷에 업로드
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('vip-signatures')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/gif',
      upsert: true
    })

  if (uploadError) {
    console.log(`  업로드 에러: ${uploadError.message}`)
  } else {
    console.log(`  업로드 성공: ${storagePath}`)

    // Public URL 가져오기
    const { data: urlData } = supabase.storage
      .from('vip-signatures')
      .getPublicUrl(storagePath)

    console.log(`  Public URL: ${urlData.publicUrl}`)

    // 7. 프로필 이미지로 설정
    console.log('\n6. 프로필 이미지 업데이트...')
    await supabase
      .from('profiles')
      .update({
        avatar_url: urlData.publicUrl,
        profile_image_url: urlData.publicUrl
      })
      .eq('id', originalProfile.id)
    console.log('  프로필 이미지 설정 완료')
  }

  // 8. 최종 확인
  console.log('\n' + '='.repeat(60))
  console.log('=== 최종 결과 ===')
  console.log('='.repeat(60))

  const { data: finalProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', originalProfile.id)
    .single()

  console.log(`\n미키™ 프로필:`)
  console.log(`  ID: ${finalProfile?.id}`)
  console.log(`  닉네임: ${finalProfile?.nickname}`)
  console.log(`  이메일: ${finalProfile?.email}`)
  console.log(`  역할: ${finalProfile?.role}`)
  console.log(`  아바타: ${finalProfile?.avatar_url}`)
  console.log(`  프로필이미지: ${finalProfile?.profile_image_url}`)

  console.log(`\n로그인 정보:`)
  console.log(`  이메일: ${newEmail}`)
  console.log(`  비밀번호: ${newPassword}`)
}

main().catch(console.error)
