/**
 * 중복 계정 분석 및 해결
 * - 같은 닉네임으로 여러 프로필이 있는 경우 찾기
 * - 기존 계정(테스트 계정) 유지, 새로 생성된 계정 삭제
 * - 비밀번호 재설정 후 CSV 출력
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as fs from 'fs'

const supabase = getServiceClient()

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const special = '!@#$%'
  let password = ''
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  for (let i = 0; i < 2; i++) {
    password += special.charAt(Math.floor(Math.random() * special.length))
  }
  return password
}

async function main() {
  console.log('=== 중복 계정 분석 및 해결 ===\n')

  // 1. 모든 VIP 프로필 조회
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'vip')
    .order('nickname')

  console.log(`총 VIP 프로필: ${allProfiles?.length}개\n`)

  // 2. 닉네임별로 그룹화하여 중복 찾기
  const nicknameGroups = new Map<string, any[]>()

  allProfiles?.forEach(p => {
    if (!p.nickname) return
    if (!nicknameGroups.has(p.nickname)) {
      nicknameGroups.set(p.nickname, [])
    }
    nicknameGroups.get(p.nickname)!.push(p)
  })

  // 중복된 닉네임 찾기
  const duplicates: { nickname: string; profiles: any[] }[] = []

  for (const [nickname, profiles] of nicknameGroups) {
    if (profiles.length > 1) {
      duplicates.push({ nickname, profiles })
    }
  }

  console.log(`중복 닉네임: ${duplicates.length}개\n`)
  console.log('='.repeat(80))

  // 3. 중복 해결 - 새로 생성된 계정 삭제
  const keptProfiles: any[] = []
  const deletedProfiles: any[] = []

  for (const dup of duplicates) {
    console.log(`\n[${dup.nickname}] - ${dup.profiles.length}개 프로필`)

    // 기준: @rgfamily.kr 이메일은 새로 생성된 것, 나머지는 기존
    // 또는 avatar_url이 있는 것이 기존
    const originalProfile = dup.profiles.find(p =>
      !p.email?.includes('@rgfamily.kr') || p.avatar_url
    ) || dup.profiles[0]

    const duplicateProfiles = dup.profiles.filter(p => p.id !== originalProfile.id)

    console.log(`  유지: ${originalProfile.email} (ID: ${originalProfile.id.substring(0, 8)}...)`)

    for (const dupProfile of duplicateProfiles) {
      console.log(`  삭제: ${dupProfile.email} (ID: ${dupProfile.id.substring(0, 8)}...)`)

      // vip_rewards 삭제
      await supabase
        .from('vip_rewards')
        .delete()
        .eq('profile_id', dupProfile.id)

      // vip_images 삭제 (reward를 통해)
      const { data: rewards } = await supabase
        .from('vip_rewards')
        .select('id')
        .eq('profile_id', dupProfile.id)

      if (rewards) {
        for (const r of rewards) {
          await supabase.from('vip_images').delete().eq('reward_id', r.id)
        }
      }

      // 프로필 삭제
      await supabase
        .from('profiles')
        .delete()
        .eq('id', dupProfile.id)

      // Auth 계정 삭제
      await supabase.auth.admin.deleteUser(dupProfile.id)

      deletedProfiles.push(dupProfile)
    }

    keptProfiles.push(originalProfile)
  }

  // 중복 없는 프로필도 추가
  for (const [nickname, profiles] of nicknameGroups) {
    if (profiles.length === 1) {
      keptProfiles.push(profiles[0])
    }
  }

  console.log(`\n삭제된 중복 계정: ${deletedProfiles.length}개`)

  // 4. 유지된 계정들 비밀번호 재설정
  console.log('\n' + '='.repeat(80))
  console.log('=== 비밀번호 재설정 ===')
  console.log('='.repeat(80))

  // 시즌/전체 랭킹 조회
  const { data: seasonRanks } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name')
    .eq('season_id', 1)
    .order('rank')
    .limit(50)

  const { data: totalRanks } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name')
    .order('rank')
    .limit(50)

  const seasonRankMap = new Map<string, number>()
  const totalRankMap = new Map<string, number>()
  seasonRanks?.forEach(r => seasonRankMap.set(r.donor_name, r.rank))
  totalRanks?.forEach(r => totalRankMap.set(r.donor_name, r.rank))

  // 랭킹에 있는 닉네임만 필터
  const rankingNicknames = new Set<string>()
  seasonRanks?.forEach(r => rankingNicknames.add(r.donor_name))
  totalRanks?.forEach(r => rankingNicknames.add(r.donor_name))

  // 유지된 VIP 계정 중 랭킹에 있는 것들만 처리
  const { data: finalProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'vip')
    .in('nickname', Array.from(rankingNicknames))

  const results: {
    nickname: string
    email: string
    password: string
    seasonRank: number | null
    totalRank: number | null
  }[] = []

  for (const profile of finalProfiles || []) {
    const newPassword = generatePassword()

    // 비밀번호 업데이트
    const { error } = await supabase.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    )

    if (error) {
      console.log(`[에러] ${profile.nickname}: ${error.message}`)
      continue
    }

    console.log(`[완료] ${profile.nickname} - ${profile.email}`)

    results.push({
      nickname: profile.nickname,
      email: profile.email,
      password: newPassword,
      seasonRank: seasonRankMap.get(profile.nickname) ?? null,
      totalRank: totalRankMap.get(profile.nickname) ?? null
    })

    await new Promise(r => setTimeout(r, 50))
  }

  // 정렬 (시즌 랭킹 순)
  results.sort((a, b) => {
    if (a.seasonRank !== null && b.seasonRank === null) return -1
    if (a.seasonRank === null && b.seasonRank !== null) return 1
    if (a.seasonRank !== null && b.seasonRank !== null) return a.seasonRank - b.seasonRank
    if (a.totalRank !== null && b.totalRank !== null) return a.totalRank - b.totalRank
    return 0
  })

  // 5. CSV 저장
  const csvHeader = '번호,닉네임,이메일(아이디),비밀번호,시즌랭킹,전체랭킹'
  const csvRows = results.map((r, i) => {
    const safeNickname = `"${r.nickname.replace(/"/g, '""')}"`
    return `${i + 1},${safeNickname},${r.email},${r.password},${r.seasonRank ?? '-'},${r.totalRank ?? '-'}`
  })

  const csvContent = [csvHeader, ...csvRows].join('\n')
  fs.writeFileSync('vip-accounts-final.csv', '\uFEFF' + csvContent, 'utf8')

  // 6. 결과 출력
  console.log('\n' + '='.repeat(100))
  console.log('=== 최종 VIP 계정 목록 ===')
  console.log('='.repeat(100))
  console.log('번호  ' + '닉네임'.padEnd(26) + '이메일(아이디)'.padEnd(40) + '비밀번호'.padEnd(16) + '시즌  전체')
  console.log('-'.repeat(100))

  results.forEach((r, i) => {
    const num = String(i + 1).padEnd(6)
    const nick = r.nickname.slice(0, 24).padEnd(26)
    const email = r.email.slice(0, 38).padEnd(40)
    const pwd = r.password.padEnd(16)
    const season = String(r.seasonRank ?? '-').padEnd(6)
    const total = String(r.totalRank ?? '-')
    console.log(`${num}${nick}${email}${pwd}${season}${total}`)
  })

  console.log('\n' + '='.repeat(100))
  console.log(`총 ${results.length}개 계정`)
  console.log(`CSV 저장: vip-accounts-final.csv`)
}

main().catch(console.error)
