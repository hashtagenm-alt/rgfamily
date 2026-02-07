/**
 * 손밍매니아 프로필 사진 및 시그니처 등록
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as fs from 'fs'

const supabase = getServiceClient()

const NICKNAME = '손밍매니아'
const RANK = 4  // 시즌 랭킹 4위
const SIGNATURE_FILE = '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/시그_전체정리/010053_손밍매니아/10053 3mb.gif'

async function main() {
  console.log(`=== ${NICKNAME} 프로필 사진 및 시그니처 등록 ===\n`)

  // 1. 프로필 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('nickname', NICKNAME)

  console.log(`${NICKNAME} 프로필 ${profiles?.length || 0}개 발견\n`)

  if (!profiles || profiles.length === 0) {
    console.log('프로필을 찾을 수 없습니다.')
    return
  }

  profiles.forEach((p, i) => {
    console.log(`프로필 ${i + 1}: ${p.email} (아바타: ${p.avatar_url ? '있음' : '없음'})`)
  })

  // 2. 시그니처 GIF 파일 업로드
  console.log('\n1. 시그니처 파일 업로드...')

  const fileBuffer = fs.readFileSync(SIGNATURE_FILE)
  const fileName = `sonming-signature-1.gif`

  // 기존 파일 삭제 후 재업로드
  await supabase.storage.from('vip-signatures').remove([fileName])

  const { error: uploadError } = await supabase.storage
    .from('vip-signatures')
    .upload(fileName, fileBuffer, {
      contentType: 'image/gif',
      upsert: true
    })

  if (uploadError) {
    console.log(`  업로드 에러: ${uploadError.message}`)
    return
  }

  const { data: urlData } = supabase.storage
    .from('vip-signatures')
    .getPublicUrl(fileName)

  const signatureUrl = urlData.publicUrl
  console.log(`  업로드 성공: ${signatureUrl}`)

  // 3. 프로필 아바타 업데이트
  console.log('\n2. 프로필 아바타 업데이트...')

  for (const profile of profiles) {
    await supabase
      .from('profiles')
      .update({ avatar_url: signatureUrl })
      .eq('id', profile.id)
    console.log(`  ${profile.email} - 아바타 설정 완료`)
  }

  // 4. VIP Rewards 처리
  console.log('\n3. VIP Rewards 처리...')

  const rewardIds: number[] = []

  for (const profile of profiles) {
    const { data: existingReward } = await supabase
      .from('vip_rewards')
      .select('*')
      .eq('profile_id', profile.id)
      .single()

    if (existingReward) {
      console.log(`  ${profile.email} - VIP Rewards 존재 (id: ${existingReward.id}, rank: ${existingReward.rank})`)
      if (existingReward.rank !== RANK) {
        await supabase
          .from('vip_rewards')
          .update({ rank: RANK })
          .eq('id', existingReward.id)
        console.log(`    → rank ${RANK}로 수정`)
      }
      rewardIds.push(existingReward.id)
    } else {
      const { data: newReward, error: insertError } = await supabase
        .from('vip_rewards')
        .insert({
          profile_id: profile.id,
          season_id: 1,
          rank: RANK,
          episode_id: 12
        })
        .select()
        .single()

      if (insertError) {
        console.log(`  ${profile.email} - VIP Rewards 생성 에러: ${insertError.message}`)
      } else {
        console.log(`  ${profile.email} - VIP Rewards 생성 완료 (id: ${newReward.id}, rank: ${RANK})`)
        rewardIds.push(newReward.id)
      }
    }
  }

  // 5. vip_images에 시그니처 등록
  console.log('\n4. 개인 시그니처 등록...')

  for (const rewardId of rewardIds) {
    const { data: existingImages } = await supabase
      .from('vip_images')
      .select('*')
      .eq('reward_id', rewardId)
      .eq('order_index', 1)

    if (existingImages && existingImages.length > 0) {
      await supabase
        .from('vip_images')
        .update({
          image_url: signatureUrl,
          title: `${NICKNAME} 시그니처 #1`
        })
        .eq('id', existingImages[0].id)
      console.log(`  reward_id ${rewardId} - 시그니처 업데이트 완료`)
    } else {
      const { error: insertError } = await supabase
        .from('vip_images')
        .insert({
          reward_id: rewardId,
          image_url: signatureUrl,
          title: `${NICKNAME} 시그니처 #1`,
          order_index: 1
        })

      if (insertError) {
        console.log(`  reward_id ${rewardId} - 등록 에러: ${insertError.message}`)
      } else {
        console.log(`  reward_id ${rewardId} - 시그니처 등록 완료`)
      }
    }
  }

  // 6. 최종 확인
  console.log('\n' + '='.repeat(60))
  console.log('=== 최종 결과 ===')
  console.log('='.repeat(60))

  const { data: finalProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, email, avatar_url')
    .eq('nickname', NICKNAME)

  finalProfiles?.forEach(p => {
    console.log(`\n${p.nickname} (${p.email})`)
    console.log(`  아바타: ${p.avatar_url}`)
  })

  const { data: vipImages } = await supabase
    .from('vip_images')
    .select('*')
    .in('reward_id', rewardIds)

  console.log('\n시그니처:')
  vipImages?.forEach(v => {
    console.log(`  - ${v.title}: ${v.image_url}`)
  })
}

main().catch(console.error)
