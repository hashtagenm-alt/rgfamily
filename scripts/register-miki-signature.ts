/**
 * 미키™ 프로필 사진 및 시그니처 등록 (두 프로필 모두)
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SIGNATURE_FILE = '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/rg 리뉴얼 시그 최종/RG리뉴얼시그 등록용/12412 3mb.gif'

async function main() {
  console.log('=== 미키™ 프로필 사진 및 시그니처 등록 ===\n')

  // 1. 미키 프로필 모두 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .ilike('nickname', '%미키%')

  console.log(`미키 프로필 ${profiles?.length || 0}개 발견\n`)

  profiles?.forEach((p, i) => {
    console.log(`프로필 ${i + 1}:`)
    console.log(`  ID: ${p.id}`)
    console.log(`  이메일: ${p.email}`)
    console.log(`  아바타: ${p.avatar_url || '없음'}`)
    console.log('')
  })

  // 2. 시그니처 GIF 파일 업로드
  console.log('1. 시그니처 파일 업로드...')

  const fileBuffer = fs.readFileSync(SIGNATURE_FILE)
  const fileName = `miki-signature-1-${Date.now()}.gif`
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
    return
  }

  console.log(`  업로드 성공: ${storagePath}`)

  // Public URL 가져오기
  const { data: urlData } = supabase.storage
    .from('vip-signatures')
    .getPublicUrl(storagePath)

  const signatureUrl = urlData.publicUrl
  console.log(`  Public URL: ${signatureUrl}\n`)

  // 3. 모든 미키 프로필에 이미지 설정
  console.log('2. 프로필 이미지 업데이트...')

  for (const profile of profiles || []) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: signatureUrl,
        profile_image_url: signatureUrl
      })
      .eq('id', profile.id)

    if (updateError) {
      console.log(`  ${profile.email} 업데이트 에러: ${updateError.message}`)
    } else {
      console.log(`  ${profile.email} - 프로필 이미지 설정 완료`)
    }
  }

  // 4. vip_rewards 확인/생성
  console.log('\n3. VIP Rewards 확인...')

  for (const profile of profiles || []) {
    const { data: existingReward } = await supabase
      .from('vip_rewards')
      .select('*')
      .eq('profile_id', profile.id)
      .single()

    if (existingReward) {
      console.log(`  ${profile.email} - VIP Rewards 존재 (rank: ${existingReward.rank})`)
      // rank가 2가 아니면 수정
      if (existingReward.rank !== 2) {
        await supabase
          .from('vip_rewards')
          .update({ rank: 2 })
          .eq('id', existingReward.id)
        console.log(`    → rank 2로 수정`)
      }
    } else {
      // VIP Rewards 생성
      const { error: insertError } = await supabase
        .from('vip_rewards')
        .insert({
          profile_id: profile.id,
          season_id: 1,
          rank: 2,
          episode_id: 12
        })

      if (insertError) {
        console.log(`  ${profile.email} - VIP Rewards 생성 에러: ${insertError.message}`)
      } else {
        console.log(`  ${profile.email} - VIP Rewards 생성 완료 (rank: 2)`)
      }
    }
  }

  // 5. 개인 시그니처 테이블에 등록
  console.log('\n4. 개인 시그니처 등록...')

  // vip_images 테이블에 등록 (개인 시그니처용)
  for (const profile of profiles || []) {
    // 기존 데이터 확인
    const { data: existingVipImage } = await supabase
      .from('vip_images')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('sig_number', 1)
      .single()

    if (existingVipImage) {
      // 업데이트
      await supabase
        .from('vip_images')
        .update({ image_url: signatureUrl })
        .eq('id', existingVipImage.id)
      console.log(`  ${profile.email} - 1번째 시그니처 업데이트 완료`)
    } else {
      // 새로 등록
      const { error: insertError } = await supabase
        .from('vip_images')
        .insert({
          profile_id: profile.id,
          nickname: '미키™',
          sig_number: 1,
          image_url: signatureUrl,
          season_id: 1
        })

      if (insertError) {
        console.log(`  ${profile.email} - 시그니처 등록 에러: ${insertError.message}`)
      } else {
        console.log(`  ${profile.email} - 1번째 시그니처 등록 완료`)
      }
    }
  }

  // 6. 최종 확인
  console.log('\n' + '='.repeat(60))
  console.log('=== 최종 결과 ===')
  console.log('='.repeat(60))

  const { data: finalProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, email, role, avatar_url, profile_image_url')
    .ilike('nickname', '%미키%')

  console.log('\n미키™ 프로필:')
  finalProfiles?.forEach((p, i) => {
    console.log(`\n[프로필 ${i + 1}]`)
    console.log(`  ID: ${p.id}`)
    console.log(`  이메일: ${p.email}`)
    console.log(`  역할: ${p.role}`)
    console.log(`  아바타: ${p.avatar_url?.substring(0, 60)}...`)
  })

  const { data: vipImages } = await supabase
    .from('vip_images')
    .select('*')
    .ilike('nickname', '%미키%')

  console.log('\n등록된 시그니처:')
  vipImages?.forEach(v => {
    console.log(`  - ${v.nickname} 시그니처 #${v.sig_number}: ${v.image_url?.substring(0, 60)}...`)
  })

  console.log(`\n시그니처 파일 URL: ${signatureUrl}`)
}

main().catch(console.error)
