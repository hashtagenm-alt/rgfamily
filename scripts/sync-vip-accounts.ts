/**
 * VIP 계정 동기화 스크립트
 * 시즌 랭킹 Top N에 맞춰 VIP 계정 및 리워드 생성/업데이트
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'
import * as fs from 'fs'

const supabase = getServiceClient()

interface VipAccountInfo {
  rank: number
  nickname: string
  email: string
  password: string
  profileId: string
  vipRewardId: number | null
  status: 'created' | 'existing' | 'updated'
}

const VIP_TOP_N = 6 // Top 6까지 VIP 자동 생성

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 VIP 계정 동기화')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. 현재 시즌 랭킹 Top N 가져오기
  const { data: rankings } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('season_id', 1)
    .order('rank')
    .limit(VIP_TOP_N)

  console.log(`📊 시즌1 Top ${VIP_TOP_N} 랭킹:`)
  for (const r of rankings || []) {
    console.log(`   ${r.rank}위: ${r.donor_name} (${r.total_amount.toLocaleString()} 하트)`)
  }

  const createdAccounts: VipAccountInfo[] = []

  // 2. 각 랭킹에 대해 계정 확인/생성
  console.log('\n🔄 VIP 계정 동기화 중...\n')

  for (const ranking of rankings || []) {
    console.log(`\n[${ranking.rank}위] ${ranking.donor_name}`)
    console.log('─'.repeat(40))

    // 2.1 프로필 확인
    let { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, email, role')
      .eq('nickname', ranking.donor_name)
      .single()

    let accountStatus: 'created' | 'existing' | 'updated' = 'existing'
    let email = ''
    let password = ''

    if (!profile) {
      // 프로필 없음 → 계정 생성
      console.log('   ❌ 프로필 없음 → 계정 생성')

      // 고유한 이메일 생성
      const sanitizedNickname = ranking.donor_name
        .replace(/[^a-zA-Z0-9가-힣]/g, '')
        .substring(0, 10)
        .toLowerCase()
      email = `vip_${sanitizedNickname}_${Date.now()}@rgfamily.internal`
      password = `VIP_${Math.random().toString(36).substring(2, 10)}!`

      // Auth 사용자 생성
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nickname: ranking.donor_name }
      })

      if (authError) {
        console.log(`   ⚠️  계정 생성 실패: ${authError.message}`)
        continue
      }

      // 프로필 업데이트 (role을 vip로)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'vip', nickname: ranking.donor_name })
        .eq('id', authUser.user.id)

      if (profileError) {
        console.log(`   ⚠️  프로필 업데이트 실패: ${profileError.message}`)
      }

      // 프로필 다시 가져오기
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('id, nickname, email, role')
        .eq('id', authUser.user.id)
        .single()

      profile = newProfile
      accountStatus = 'created'
      console.log(`   ✅ 계정 생성 완료`)
      console.log(`      Email: ${email}`)
      console.log(`      Password: ${password}`)
    } else {
      console.log(`   ✅ 프로필 있음 (role: ${profile.role})`)
      email = profile.email || ''

      // role이 vip가 아니면 업데이트
      if (profile.role !== 'vip') {
        await supabase
          .from('profiles')
          .update({ role: 'vip' })
          .eq('id', profile.id)
        console.log(`   🔄 Role 업데이트: ${profile.role} → vip`)
        accountStatus = 'updated'
      }
    }

    // 2.2 VIP Reward 확인/생성
    const { data: existingReward } = await supabase
      .from('vip_rewards')
      .select('id, rank')
      .eq('profile_id', profile?.id)
      .eq('season_id', 1)
      .single()

    let vipRewardId: number | null = null

    if (!existingReward) {
      // VIP Reward 생성
      const { data: newReward, error: rewardError } = await supabase
        .from('vip_rewards')
        .insert({
          profile_id: profile?.id,
          season_id: 1,
          rank: ranking.rank
        })
        .select()
        .single()

      if (rewardError) {
        console.log(`   ⚠️  VIP Reward 생성 실패: ${rewardError.message}`)
      } else {
        vipRewardId = newReward.id
        console.log(`   ✅ VIP Reward 생성 (ID: ${vipRewardId})`)
      }
    } else {
      vipRewardId = existingReward.id
      // Rank 업데이트
      if (existingReward.rank !== ranking.rank) {
        await supabase
          .from('vip_rewards')
          .update({ rank: ranking.rank })
          .eq('id', existingReward.id)
        console.log(`   🔄 VIP Rank 업데이트: ${existingReward.rank} → ${ranking.rank}`)
      } else {
        console.log(`   ✅ VIP Reward 있음 (ID: ${existingReward.id}, Rank: ${existingReward.rank})`)
      }
    }

    createdAccounts.push({
      rank: ranking.rank,
      nickname: ranking.donor_name,
      email,
      password,
      profileId: profile?.id || '',
      vipRewardId,
      status: accountStatus
    })
  }

  // 3. 결과 요약
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 동기화 결과')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('| Rank | 닉네임 | 상태 | VIP ID |')
  console.log('|------|--------|------|--------|')
  for (const acc of createdAccounts) {
    const statusIcon = acc.status === 'created' ? '🆕' : acc.status === 'updated' ? '🔄' : '✅'
    console.log(`| ${acc.rank}위 | ${acc.nickname.substring(0, 15).padEnd(15)} | ${statusIcon} ${acc.status.padEnd(8)} | ${acc.vipRewardId || 'N/A'} |`)
  }

  // 4. 신규 생성된 계정 정보 저장
  const newAccounts = createdAccounts.filter(a => a.status === 'created')
  if (newAccounts.length > 0) {
    console.log('\n🆕 신규 생성된 계정:')
    console.log('─'.repeat(60))
    for (const acc of newAccounts) {
      console.log(`${acc.rank}위 ${acc.nickname}`)
      console.log(`  Email: ${acc.email}`)
      console.log(`  Password: ${acc.password}`)
      console.log('')
    }

    // credentials 파일에 추가
    const credentialsPath = '/Users/bagjaeseog/rg-family/docs/VIP_CREDENTIALS.md'
    const existingContent = fs.existsSync(credentialsPath) ? fs.readFileSync(credentialsPath, 'utf-8') : ''

    const newContent = newAccounts.map(acc => `
### ${acc.rank}위 - ${acc.nickname}
- **Email**: ${acc.email}
- **Password**: ${acc.password}
- **Profile ID**: ${acc.profileId}
- **VIP Reward ID**: ${acc.vipRewardId}
- **생성일**: ${new Date().toISOString().split('T')[0]}
`).join('\n')

    const header = existingContent ? '' : `# VIP 계정 관리

⚠️ **주의**: 이 파일은 민감한 정보를 포함합니다. 외부 유출 금지!

## 계정 목록

`

    fs.writeFileSync(credentialsPath, existingContent + header + newContent)
    console.log(`📁 계정 정보 저장됨: ${credentialsPath}`)
  }

  console.log('\n✅ VIP 계정 동기화 완료!')
}

main().catch(console.error)
