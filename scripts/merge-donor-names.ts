/**
 * 후원자 닉네임 통합 스크립트
 *
 * 같은 사람이 닉네임을 바꾼 경우, donations 테이블에서 하나로 통합합니다.
 * 프로필 이미지(avatar_url)가 있는 profiles을 대표 프로필로 선택합니다.
 * 통합 후 시즌 랭킹 / 종합 랭킹 재갱신이 필요합니다.
 *
 * 사용법:
 *   npx tsx scripts/merge-donor-names.ts --target="[J]젖문가" --aliases="젖문가™,양재동ღ젖문가⁀➷"
 *   npx tsx scripts/merge-donor-names.ts --target="[J]젖문가" --aliases="젖문가™,양재동ღ젖문가⁀➷" --dry-run
 *
 * 옵션:
 *   --target=<닉네임>   통합할 대표 닉네임 (필수)
 *   --aliases=<닉네임들> 대표 닉네임으로 변경할 이전 닉네임들 (쉼표 구분, 필수)
 *   --dry-run           실제 변경하지 않고 미리보기만
 */

import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

function parseArgs() {
  const args = process.argv.slice(2)
  let target = ''
  let aliases: string[] = []
  let dryRun = false

  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      target = arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')
    } else if (arg.startsWith('--aliases=')) {
      const aliasStr = arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')
      aliases = aliasStr.split(',').map((a) => a.trim()).filter(Boolean)
    } else if (arg === '--dry-run') {
      dryRun = true
    }
  }

  if (!target || aliases.length === 0) {
    console.error('사용법: npx tsx scripts/merge-donor-names.ts --target="대표닉" --aliases="이전닉1,이전닉2"')
    process.exit(1)
  }

  return { target, aliases, dryRun }
}

async function main() {
  const { target, aliases, dryRun } = parseArgs()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔀 후원자 닉네임 통합')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   대표 닉네임: ${target}`)
  console.log(`   통합 대상: ${aliases.join(', ')}`)
  if (dryRun) console.log('   ⚠️  DRY-RUN 모드')

  // 각 닉네임별 현황 확인
  const allNames = [target, ...aliases]
  console.log('\n📊 현황:')

  for (const name of allNames) {
    const { count } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('donor_name', name)

    const { data: sumData } = await supabase
      .from('donations')
      .select('amount')
      .eq('donor_name', name)

    const total = sumData?.reduce((s, d) => s + d.amount, 0) || 0
    const label = name === target ? '(대표)' : '→ 통합'
    console.log(`   ${label} ${name}: ${count || 0}건, ${total.toLocaleString()}하트`)
  }

  if (dryRun) {
    console.log('\n💡 실제 통합하려면 --dry-run 옵션 없이 실행하세요.')
    console.log('💡 통합 후: npx tsx scripts/update-season-rankings.ts --season=1 --unit=excel')
    return
  }

  // donations 테이블 통합
  console.log('\n🔄 donations 테이블 닉네임 변경 중...')
  let totalUpdated = 0

  for (const alias of aliases) {
    const { data, error } = await supabase
      .from('donations')
      .update({ donor_name: target })
      .eq('donor_name', alias)
      .select('id')

    if (error) {
      console.error(`   ❌ ${alias} 변경 실패:`, error.message)
    } else {
      const count = data?.length || 0
      totalUpdated += count
      console.log(`   ✅ ${alias} → ${target}: ${count}건 변경`)
    }
  }

  console.log(`\n✅ 총 ${totalUpdated}건 닉네임 통합 완료`)

  // 통합 결과 확인
  const { count: finalCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('donor_name', target)

  const { data: finalSum } = await supabase
    .from('donations')
    .select('amount')
    .eq('donor_name', target)

  const finalTotal = finalSum?.reduce((s, d) => s + d.amount, 0) || 0
  console.log(`   📊 통합 후 ${target}: ${finalCount}건, ${finalTotal.toLocaleString()}하트`)

  // 프로필 통합: avatar_url이 있는 프로필을 대표로 선택
  console.log('\n🖼️  프로필 통합 중...')
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url')
    .in('nickname', allNames)

  if (profiles && profiles.length > 0) {
    console.log('   발견된 프로필:')
    for (const p of profiles) {
      const hasAvatar = p.avatar_url ? '🖼️ 이미지 있음' : '⬜ 이미지 없음'
      console.log(`   - ${p.nickname}: ${hasAvatar}`)
    }

    // avatar_url이 있는 프로필 우선 선택
    const profileWithAvatar = profiles.find((p) => p.avatar_url)
    const bestProfile = profileWithAvatar || profiles[0]

    if (bestProfile) {
      // 대표 프로필 닉네임을 target으로 업데이트
      if (bestProfile.nickname !== target) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ nickname: target })
          .eq('id', bestProfile.id)

        if (updateErr) {
          console.error(`   ⚠️  프로필 닉네임 변경 실패:`, updateErr.message)
        } else {
          console.log(`   ✅ 프로필 닉네임 변경: ${bestProfile.nickname} → ${target}`)
        }
      }

      // donations의 donor_id도 대표 프로필로 통합
      const { error: donorIdErr } = await supabase
        .from('donations')
        .update({ donor_id: bestProfile.id })
        .eq('donor_name', target)

      if (!donorIdErr) {
        console.log(`   ✅ donations donor_id 통합: ${bestProfile.id}`)
      }

      // 중복 프로필 정리 안내 (삭제는 수동으로)
      const otherProfiles = profiles.filter((p) => p.id !== bestProfile.id)
      if (otherProfiles.length > 0) {
        console.log(`   ⚠️  중복 프로필 ${otherProfiles.length}개 존재 (수동 정리 필요):`)
        for (const p of otherProfiles) {
          console.log(`      - ${p.nickname} (${p.id})`)
        }
      }
    }
  } else {
    console.log('   프로필 없음 (donations만 통합됨)')
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💡 다음 단계: 시즌/종합 랭킹 재갱신')
  console.log('   npx tsx scripts/update-season-rankings.ts --season=1 --unit=excel')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
