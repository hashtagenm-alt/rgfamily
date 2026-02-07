/**
 * 미키™ 프로필 사진 및 시그니처 등록 (수정 버전)
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as fs from 'fs'

const supabase = getServiceClient()

const SIGNATURE_FILE = '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/rg 리뉴얼 시그 최종/RG리뉴얼시그 등록용/12412 3mb.gif'

async function main() {
  console.log('=== 미키™ 프로필 사진 및 시그니처 등록 ===\n')

  // 1. 미키 프로필 모두 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .ilike('nickname', '%미키%')

  console.log(`미키 프로필 ${profiles?.length || 0}개 발견\n`)

  // 2. 시그니처 GIF 파일 업로드
  console.log('1. 시그니처 파일 업로드...')

  const fileBuffer = fs.readFileSync(SIGNATURE_FILE)
  const fileName = `miki-signature-1.gif`
  const storagePath = `${fileName}`

  // 기존 파일 삭제 후 재업로드
  await supabase.storage.from('vip-signatures').remove([storagePath])

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

  // Public URL
  const { data: urlData } = supabase.storage
    .from('vip-signatures')
    .getPublicUrl(storagePath)

  const signatureUrl = urlData.publicUrl
  console.log(`  Public URL: ${signatureUrl}\n`)

  // 3. 모든 미키 프로필에 avatar_url 설정
  console.log('2. 프로필 아바타 업데이트...')

  for (const profile of profiles || []) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: signatureUrl })
      .eq('id', profile.id)

    if (updateError) {
      console.log(`  ${profile.email} 업데이트 에러: ${updateError.message}`)
    } else {
      console.log(`  ${profile.email} - 아바타 설정 완료`)
    }
  }

  // 4. vip_rewards 확인 및 생성/수정
  console.log('\n3. VIP Rewards 처리...')

  const rewardIds: number[] = []

  for (const profile of profiles || []) {
    // 기존 vip_rewards 확인
    const { data: existingReward } = await supabase
      .from('vip_rewards')
      .select('*')
      .eq('profile_id', profile.id)
      .single()

    if (existingReward) {
      console.log(`  ${profile.email} - VIP Rewards 존재 (id: ${existingReward.id}, rank: ${existingReward.rank})`)
      // rank가 2가 아니면 수정
      if (existingReward.rank !== 2) {
        await supabase
          .from('vip_rewards')
          .update({ rank: 2 })
          .eq('id', existingReward.id)
        console.log(`    → rank 2로 수정`)
      }
      rewardIds.push(existingReward.id)
    } else {
      // VIP Rewards 생성
      const { data: newReward, error: insertError } = await supabase
        .from('vip_rewards')
        .insert({
          profile_id: profile.id,
          season_id: 1,
          rank: 2,
          episode_id: 12
        })
        .select()
        .single()

      if (insertError) {
        console.log(`  ${profile.email} - VIP Rewards 생성 에러: ${insertError.message}`)
      } else {
        console.log(`  ${profile.email} - VIP Rewards 생성 완료 (id: ${newReward.id}, rank: 2)`)
        rewardIds.push(newReward.id)
      }
    }
  }

  // 5. vip_images에 시그니처 등록 (reward_id 기준)
  console.log('\n4. 개인 시그니처 등록 (vip_images)...')

  for (const rewardId of rewardIds) {
    // 기존 이미지 확인
    const { data: existingImages } = await supabase
      .from('vip_images')
      .select('*')
      .eq('reward_id', rewardId)
      .eq('order_index', 1)

    if (existingImages && existingImages.length > 0) {
      // 업데이트
      await supabase
        .from('vip_images')
        .update({
          image_url: signatureUrl,
          title: '미키™ 시그니처 #1'
        })
        .eq('id', existingImages[0].id)
      console.log(`  reward_id ${rewardId} - 1번째 시그니처 업데이트 완료`)
    } else {
      // 새로 등록
      const { error: insertError } = await supabase
        .from('vip_images')
        .insert({
          reward_id: rewardId,
          image_url: signatureUrl,
          title: '미키™ 시그니처 #1',
          order_index: 1
        })

      if (insertError) {
        console.log(`  reward_id ${rewardId} - 시그니처 등록 에러: ${insertError.message}`)
      } else {
        console.log(`  reward_id ${rewardId} - 1번째 시그니처 등록 완료`)
      }
    }
  }

  // 6. 최종 확인
  console.log('\n' + '='.repeat(60))
  console.log('=== 최종 결과 ===')
  console.log('='.repeat(60))

  const { data: finalProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, email, role, avatar_url')
    .ilike('nickname', '%미키%')

  console.log('\n미키™ 프로필:')
  finalProfiles?.forEach((p, i) => {
    console.log(`\n[프로필 ${i + 1}]`)
    console.log(`  ID: ${p.id}`)
    console.log(`  이메일: ${p.email}`)
    console.log(`  역할: ${p.role}`)
    console.log(`  아바타: ${p.avatar_url}`)
  })

  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('id, profile_id, rank')
    .in('profile_id', finalProfiles?.map(p => p.id) || [])

  console.log('\nVIP Rewards:')
  vipRewards?.forEach(v => {
    console.log(`  - reward_id: ${v.id}, profile_id: ${v.profile_id}, rank: ${v.rank}`)
  })

  const { data: vipImages } = await supabase
    .from('vip_images')
    .select('*')
    .in('reward_id', vipRewards?.map(v => v.id) || [])

  console.log('\n등록된 시그니처 이미지:')
  vipImages?.forEach(v => {
    console.log(`  - reward_id: ${v.reward_id}, order: ${v.order_index}`)
    console.log(`    title: ${v.title}`)
    console.log(`    url: ${v.image_url}`)
  })
}

main().catch(console.error)
