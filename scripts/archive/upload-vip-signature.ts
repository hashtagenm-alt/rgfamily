/**
 * VIP 시그니처 이미지 업로드 스크립트
 *
 * 사용법:
 *   npx tsx scripts/upload-vip-signature.ts --reward-id=17 --file="/path/to/image.png" --title="한세아내꺼♡호랭이 시그니처"
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

function parseArgs() {
  const args = process.argv.slice(2)
  let rewardId: number | null = null
  let filePath: string | null = null
  let title: string | null = null

  for (const arg of args) {
    if (arg.startsWith('--reward-id=')) {
      rewardId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--file=')) {
      filePath = arg.split('=')[1].replace(/^["']|["']$/g, '')
    } else if (arg.startsWith('--title=')) {
      title = arg.split('=')[1].replace(/^["']|["']$/g, '')
    }
  }

  return { rewardId, filePath, title }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📸 VIP 시그니처 이미지 업로드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const { rewardId, filePath, title } = parseArgs()

  if (!rewardId || !filePath) {
    console.log('사용법:')
    console.log('  npx tsx scripts/upload-vip-signature.ts --reward-id=<ID> --file="<파일경로>" [--title="<제목>"]')
    console.log('')
    console.log('예시:')
    console.log('  npx tsx scripts/upload-vip-signature.ts --reward-id=17 --file="/Users/bagjaeseog/Downloads/horangi.png" --title="한세아내꺼♡호랭이 시그니처"')
    console.log('')

    // 현재 VIP Rewards 목록 표시
    const { data: rewards } = await supabase
      .from('vip_rewards')
      .select('id, rank, profiles!inner(nickname)')
      .order('rank')

    console.log('📋 현재 VIP Rewards:')
    for (const r of rewards || []) {
      const nickname = (r as any).profiles?.nickname || 'N/A'
      console.log(`  ID ${r.id}: Rank ${r.rank} - ${nickname}`)
    }
    return
  }

  // 파일 존재 확인
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${absolutePath}`)
    return
  }

  // VIP Reward 존재 확인
  const { data: reward, error: rewardError } = await supabase
    .from('vip_rewards')
    .select('id, rank, profiles!inner(nickname)')
    .eq('id', rewardId)
    .single()

  if (rewardError || !reward) {
    console.error(`❌ VIP Reward ID ${rewardId}를 찾을 수 없습니다.`)
    return
  }

  const nickname = (reward as any).profiles?.nickname || 'Unknown'
  console.log(`📌 대상: Rank ${reward.rank} - ${nickname}`)
  console.log(`📁 파일: ${absolutePath}`)

  // 파일 읽기
  const fileBuffer = fs.readFileSync(absolutePath)
  const ext = path.extname(absolutePath).toLowerCase()
  // Supabase Storage에서 한글 파일명 지원 안됨 - ASCII 안전 파일명 사용
  const safeNickname = nickname.replace(/[^a-zA-Z0-9]/g, '') || 'vip'
  const fileName = `vip-rank-${reward.rank}-${safeNickname.slice(0, 10)}-${Date.now()}${ext}`

  // 파일 타입 결정
  const contentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  }
  const contentType = contentTypes[ext] || 'image/png'

  console.log(`\n📤 Supabase Storage 업로드 중...`)

  // Supabase Storage에 업로드
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('vip-signatures')
    .upload(fileName, fileBuffer, {
      contentType,
      upsert: true
    })

  if (uploadError) {
    console.error('❌ 업로드 실패:', uploadError.message)
    return
  }

  // 공개 URL 생성
  const { data: urlData } = supabase.storage
    .from('vip-signatures')
    .getPublicUrl(fileName)

  const imageUrl = urlData.publicUrl
  console.log(`   ✅ 업로드 완료: ${imageUrl}`)

  // 기존 이미지 수 확인 (order_index 결정용)
  const { count: existingCount } = await supabase
    .from('vip_images')
    .select('*', { count: 'exact', head: true })
    .eq('reward_id', rewardId)

  const orderIndex = (existingCount || 0) + 1

  // vip_images 레코드 생성
  console.log(`\n📊 vip_images 레코드 생성 중...`)

  const { data: imageRecord, error: imageError } = await supabase
    .from('vip_images')
    .insert({
      reward_id: rewardId,
      image_url: imageUrl,
      title: title || `${nickname} 시그니처`,
      order_index: orderIndex
    })
    .select()
    .single()

  if (imageError) {
    console.error('❌ 레코드 생성 실패:', imageError.message)
    return
  }

  console.log(`   ✅ 레코드 생성 완료: ID ${imageRecord.id}`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 VIP 시그니처 이미지 업로드 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n📸 이미지 URL: ${imageUrl}`)
  console.log(`👤 VIP: ${nickname} (Rank ${reward.rank})`)
  console.log(`🏷️  제목: ${imageRecord.title}`)
}

main().catch(console.error)
