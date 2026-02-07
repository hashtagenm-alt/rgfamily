/**
 * 중복 프로필 정리 스크립트
 *
 * 동일 닉네임의 중복 프로필 중 가장 먼저 생성된 것만 유지하고
 * 나머지는 삭제합니다. 단, VIP 데이터가 연결된 프로필은 우선 유지합니다.
 *
 * 사용법:
 *   npx tsx scripts/cleanup-duplicate-profiles.ts --analyze  # 분석만
 *   npx tsx scripts/cleanup-duplicate-profiles.ts --cleanup  # 실제 정리
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
const supabase = getServiceClient()

interface Profile {
  id: string
  nickname: string
  created_at: string
  avatar_url: string | null
  role: string | null
}

interface DuplicateGroup {
  nickname: string
  profiles: Profile[]
  keepId: string
  deleteIds: string[]
}

async function findDuplicates(): Promise<DuplicateGroup[]> {
  // 전체 프로필 조회
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, nickname, created_at, avatar_url, role')
    .order('created_at', { ascending: true })

  if (error || !profiles) {
    console.error('프로필 조회 실패:', error?.message)
    return []
  }

  // 닉네임별 그룹화
  const byNickname: Record<string, Profile[]> = {}
  for (const p of profiles) {
    if (!byNickname[p.nickname]) byNickname[p.nickname] = []
    byNickname[p.nickname].push(p)
  }

  // 중복 그룹 필터링
  const duplicates: DuplicateGroup[] = []

  for (const [nickname, list] of Object.entries(byNickname)) {
    if (list.length <= 1) continue

    // VIP 또는 관리자 역할이 있는 프로필 우선
    // 없으면 avatar_url이 있는 프로필 우선
    // 그래도 없으면 가장 먼저 생성된 프로필
    let keepProfile = list.find(p => p.role && ['vip', 'admin', 'superadmin', 'moderator'].includes(p.role))
    if (!keepProfile) {
      keepProfile = list.find(p => p.avatar_url)
    }
    if (!keepProfile) {
      keepProfile = list[0] // 가장 먼저 생성된 것
    }

    const deleteIds = list.filter(p => p.id !== keepProfile!.id).map(p => p.id)

    duplicates.push({
      nickname,
      profiles: list,
      keepId: keepProfile.id,
      deleteIds
    })
  }

  return duplicates
}

async function checkReferences(profileId: string): Promise<string[]> {
  const refs: string[] = []

  // vip_rewards 체크
  const { count: vipCount } = await supabase
    .from('vip_rewards')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
  if (vipCount && vipCount > 0) refs.push(`vip_rewards: ${vipCount}`)

  // total_donation_rankings 체크
  const { count: totalCount } = await supabase
    .from('total_donation_rankings')
    .select('*', { count: 'exact', head: true })
    .eq('donor_id', profileId)
  if (totalCount && totalCount > 0) refs.push(`total_donation_rankings: ${totalCount}`)

  // season_donation_rankings 체크
  const { count: seasonCount } = await supabase
    .from('season_donation_rankings')
    .select('*', { count: 'exact', head: true })
    .eq('donor_id', profileId)
  if (seasonCount && seasonCount > 0) refs.push(`season_donation_rankings: ${seasonCount}`)

  // signature_videos 체크
  const { count: sigVideoCount } = await supabase
    .from('signature_videos')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
  if (sigVideoCount && sigVideoCount > 0) refs.push(`signature_videos: ${sigVideoCount}`)

  return refs
}

async function analyze() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 중복 프로필 분석')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const duplicates = await findDuplicates()

  if (duplicates.length === 0) {
    console.log('✅ 중복 프로필이 없습니다.')
    return
  }

  console.log(`중복 발견: ${duplicates.length}개 닉네임\n`)

  for (const dup of duplicates) {
    console.log(`\n🔸 ${dup.nickname} (${dup.profiles.length}개)`)
    console.log('─'.repeat(50))

    for (const p of dup.profiles) {
      const isKeep = p.id === dup.keepId
      const status = isKeep ? '✅ 유지' : '❌ 삭제 대상'
      const hasAvatar = p.avatar_url ? '🖼️' : ''
      const role = p.role ? `[${p.role}]` : ''

      console.log(`  ${status} ${p.id.slice(0, 8)}... ${role} ${hasAvatar}`)
      console.log(`         생성: ${p.created_at}`)

      if (!isKeep) {
        const refs = await checkReferences(p.id)
        if (refs.length > 0) {
          console.log(`         ⚠️  참조: ${refs.join(', ')}`)
        }
      }
    }
  }

  const totalToDelete = duplicates.reduce((sum, d) => sum + d.deleteIds.length, 0)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 삭제 예정: ${totalToDelete}개 프로필`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n실제 삭제하려면 --cleanup 옵션을 사용하세요.')
}

async function cleanup() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧹 중복 프로필 정리 시작')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const duplicates = await findDuplicates()

  if (duplicates.length === 0) {
    console.log('✅ 중복 프로필이 없습니다.')
    return
  }

  let deleted = 0
  let skipped = 0

  for (const dup of duplicates) {
    console.log(`\n🔸 ${dup.nickname}`)

    for (const deleteId of dup.deleteIds) {
      // 참조 확인
      const refs = await checkReferences(deleteId)
      if (refs.length > 0) {
        console.log(`  ⚠️  ${deleteId.slice(0, 8)}... 참조 있음 - 스킵 (${refs.join(', ')})`)
        skipped++
        continue
      }

      // 삭제 실행
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteId)

      if (error) {
        console.log(`  ❌ ${deleteId.slice(0, 8)}... 삭제 실패: ${error.message}`)
        skipped++
      } else {
        console.log(`  ✅ ${deleteId.slice(0, 8)}... 삭제 완료`)
        deleted++
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: ${deleted}개 삭제, ${skipped}개 스킵`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
중복 프로필 정리 스크립트

사용법:
  npx tsx scripts/cleanup-duplicate-profiles.ts [옵션]

옵션:
  --analyze   중복 프로필 분석 (삭제하지 않음)
  --cleanup   중복 프로필 실제 삭제

주의:
  - 가장 먼저 생성된 프로필 또는 VIP/관리자 역할이 있는 프로필 유지
  - 다른 테이블에서 참조 중인 프로필은 삭제하지 않음
`)
    return
  }

  if (args.includes('--analyze')) {
    await analyze()
  } else if (args.includes('--cleanup')) {
    await cleanup()
  }
}

main().catch(console.error)
