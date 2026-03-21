/**
 * VIP 개인페이지 일괄 오픈
 *
 * 대상:
 *   1. ❥CaNnOt (9위)  - 프로필 있음, 아바타 없음 → 플레이스홀더 생성
 *   2. FA진수 (11위)   - 프로필 없음, 이미지 없음 → 가상계정 + 플레이스홀더
 *   3. 주미이단__⁀ (14위) - 프로필 없음, 이미지 있음 → 가상계정 + GIF 업로드
 *   4. 조용남이 (16위)  - 프로필 없음, 이미지 있음 → 가상계정 + GIF 업로드
 *
 * 각 유저에 대해:
 *   - 프로필 생성/업데이트 (avatar_url)
 *   - signature_eligibility upsert
 *   - vip_rewards 생성
 *   - vip_images 추가 (이미지 있는 경우)
 *   - vip_clickable_profiles View 검증
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'
import * as crypto from 'crypto'
import sharp from 'sharp'

const supabase = getServiceClient()
const BUCKET_NAME = 'vip-signatures'

// ============================================
// 대상 유저 정의
// ============================================

interface VipUser {
  donorName: string
  rank: number
  existingProfileId?: string // 이미 프로필이 있는 경우
  existingRewardId?: number  // 이미 vip_rewards가 있는 경우
  hasSigEligibility?: boolean
  imagePath?: string         // GIF 이미지 경로 (없으면 플레이스홀더)
  filePrefix: string         // 업로드 파일명 접두사
}

const USERS: VipUser[] = [
  {
    donorName: '❥CaNnOt',
    rank: 9,
    existingProfileId: 'cf84b9a9-0d19-4705-9458-e5984167aa9b',
    existingRewardId: 34,
    hasSigEligibility: true,
    filePrefix: 'cannot-10023',
  },
  {
    donorName: 'FA진수',
    rank: 11,
    filePrefix: 'fajinsu-10038',
  },
  {
    donorName: '주미이단__⁀',
    rank: 14,
    imagePath: '/Users/bagjaeseog/Downloads/89b927a7-1a18-4371-96bf-c4f82e8fd2e4.gif',
    filePrefix: 'jumiidan-10028',
  },
  {
    donorName: '조용남이',
    rank: 16,
    imagePath: '/Users/bagjaeseog/Downloads/1ba9b9b6-b33b-457e-abae-d0b062c03e6a.gif',
    filePrefix: 'joyongnam-10042',
  },
]

// ============================================
// 플레이스홀더 이미지 생성 (sharp)
// ============================================

async function generatePlaceholder(initial: string): Promise<Buffer> {
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2d1b4e;stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="20" fill="url(#bg)"/>
      <text x="100" y="115" font-family="Arial,sans-serif" font-size="64"
            font-weight="bold" fill="#fd68ba" text-anchor="middle">${initial}</text>
    </svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ============================================
// 이미지 업로드
// ============================================

async function uploadImage(
  user: VipUser,
): Promise<string> {
  let buffer: Buffer
  let contentType: string
  let ext: string

  if (user.imagePath) {
    if (!fs.existsSync(user.imagePath)) {
      throw new Error(`파일 없음: ${user.imagePath}`)
    }
    buffer = fs.readFileSync(user.imagePath)
    contentType = 'image/gif'
    ext = 'gif'
  } else {
    const initial = user.donorName.replace(/[^a-zA-Z가-힣]/g, '').charAt(0) || 'V'
    buffer = await generatePlaceholder(initial)
    contentType = 'image/png'
    ext = 'png'
  }

  const fileName = `${user.filePrefix}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, { contentType, upsert: true })

  if (error) throw new Error(`업로드 실패 (${user.donorName}): ${error.message}`)

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)
  return data.publicUrl
}

// ============================================
// 가상 프로필 생성
// ============================================

async function createVirtualProfile(donorName: string): Promise<string> {
  const slug = donorName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10)
  const email = `${slug}_vip_${Date.now()}@rgfamily.internal`

  // auth.users에 먼저 생성 (profiles FK 제약)
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { nickname: donorName },
  })

  if (authError) throw new Error(`Auth 유저 생성 실패 (${donorName}): ${authError.message}`)
  const id = authUser.user.id

  // profiles에 upsert (auth trigger가 이미 생성했을 수 있음)
  const { error } = await supabase.from('profiles').upsert({
    id,
    nickname: donorName,
    email,
    role: 'vip',
    account_type: 'virtual',
  })

  if (error) throw new Error(`프로필 생성 실패 (${donorName}): ${error.message}`)
  return id
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎯 VIP 개인페이지 일괄 오픈')
  console.log('═'.repeat(60))
  console.log(`   대상: ${USERS.map(u => u.donorName).join(', ')}`)
  console.log('')

  for (const user of USERS) {
    console.log('─'.repeat(60))
    console.log(`👤 ${user.donorName} (${user.rank}위)`)
    console.log('─'.repeat(60))

    // 1. 이미지 업로드
    console.log('  📤 이미지 업로드...')
    const avatarUrl = await uploadImage(user)
    console.log(`     ✅ ${user.imagePath ? 'GIF' : '플레이스홀더'}: ${avatarUrl}`)

    // 2. 프로필 생성 또는 업데이트
    let profileId: string
    if (user.existingProfileId) {
      profileId = user.existingProfileId
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profileId)
      if (error) throw new Error(`프로필 업데이트 실패: ${error.message}`)
      console.log('  👤 프로필 avatar_url 업데이트 완료')
    } else {
      profileId = await createVirtualProfile(user.donorName)
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profileId)
      if (error) throw new Error(`프로필 avatar 설정 실패: ${error.message}`)
      console.log(`  👤 가상 프로필 생성: ${profileId}`)
    }

    // 3. signature_eligibility upsert
    if (!user.hasSigEligibility) {
      const { error } = await supabase
        .from('signature_eligibility')
        .upsert(
          {
            profile_id: profileId,
            donor_name: user.donorName,
            sig_number: 1,
            daily_amount: 100000,
            threshold_amount: 100000,
            notes: `${user.donorName} VIP 개인페이지 개설`,
          },
          { onConflict: 'donor_name,sig_number' },
        )
      if (error) throw new Error(`sig_eligibility 실패: ${error.message}`)
      console.log('  💎 signature_eligibility 추가 완료')
    } else {
      console.log('  💎 signature_eligibility 이미 존재 (스킵)')
    }

    // 4. vip_rewards 생성 또는 업데이트
    let rewardId: number
    if (user.existingRewardId) {
      rewardId = user.existingRewardId
      console.log(`  🏆 vip_rewards 이미 존재 (id=${rewardId}, 스킵)`)
    } else {
      const { data: reward, error } = await supabase
        .from('vip_rewards')
        .insert({
          profile_id: profileId,
          season_id: 1,
          rank: user.rank,
        })
        .select()
        .single()
      if (error) throw new Error(`vip_rewards 생성 실패: ${error.message}`)
      rewardId = reward.id
      console.log(`  🏆 vip_rewards 생성 (id=${rewardId}, rank=${user.rank})`)
    }

    // 5. vip_images 추가 (이미지가 있는 경우)
    if (user.imagePath) {
      const { error } = await supabase
        .from('vip_images')
        .insert({
          reward_id: rewardId,
          image_url: avatarUrl,
          order_index: 0,
        })
      if (error) throw new Error(`vip_images 추가 실패: ${error.message}`)
      console.log('  🖼️  vip_images 추가 완료')
    }

    // 6. 검증
    const { data: vcp } = await supabase
      .from('vip_clickable_profiles')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (vcp) {
      console.log(`  ✅ is_vip_clickable = ${(vcp as any).is_vip_clickable}`)
    } else {
      console.log('  ⚠️  vip_clickable_profiles에 미포함 (View 조건 확인 필요)')
    }

    console.log(`  🔗 /ranking/vip/${profileId}`)
    console.log('')
  }

  // 전체 검증
  console.log('═'.repeat(60))
  console.log('📊 최종 검증')
  console.log('═'.repeat(60))

  for (const user of USERS) {
    const pid = user.existingProfileId
    const { data: p } = pid
      ? await supabase.from('profiles').select('id, nickname, avatar_url, role').eq('id', pid).single()
      : await supabase.from('profiles').select('id, nickname, avatar_url, role').eq('nickname', user.donorName).single()

    const isClickable = p
      ? await supabase.from('vip_clickable_profiles').select('is_vip_clickable').eq('profile_id', p.id).maybeSingle()
      : null

    console.log(
      `  ${(isClickable?.data as any)?.is_vip_clickable ? '✅' : '❌'} ${user.donorName} (${user.rank}위)` +
      ` | avatar: ${p?.avatar_url ? 'YES' : 'NO'}` +
      ` | clickable: ${(isClickable?.data as any)?.is_vip_clickable ?? false}`,
    )
  }

  console.log('')
  console.log('═'.repeat(60))
  console.log('✅ 모든 작업 완료!')
  console.log('═'.repeat(60))
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
