import { getServiceClient } from './lib/supabase'
/**
 * 랭킹 테이블의 donor_id NULL 항목을 프로필과 연결하는 스크립트
 *
 * 닉네임 정확 매칭으로 프로필 ID 연결
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = getServiceClient()

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('🔧 donor_id 연결 수정 시작...')
  if (dryRun) {
    console.log('   (DRY RUN 모드 - 실제 변경 없음)\n')
  } else {
    console.log('   (실제 변경 적용됨)\n')
  }

  // 1. 모든 프로필 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')

  if (!profiles || profiles.length === 0) {
    console.error('❌ 프로필 데이터 없음')
    return
  }

  // 닉네임 → 프로필 ID 맵 생성
  const nicknameToProfile = new Map<string, string>()
  for (const profile of profiles) {
    if (profile.nickname) {
      nicknameToProfile.set(profile.nickname, profile.id)
    }
  }

  console.log(`📊 프로필 ${profiles.length}개 로드됨\n`)

  // 2. 종합 랭킹 수정
  console.log('📌 종합 랭킹 donor_id 연결:')
  const { data: totalNulls } = await supabase
    .from('total_donation_rankings')
    .select('id, rank, donor_name')
    .is('donor_id', null)
    .order('rank', { ascending: true })

  let totalFixed = 0
  let totalSkipped = 0

  for (const item of totalNulls || []) {
    const profileId = nicknameToProfile.get(item.donor_name)

    if (profileId) {
      if (!dryRun) {
        const { error } = await supabase
          .from('total_donation_rankings')
          .update({ donor_id: profileId })
          .eq('id', item.id)

        if (error) {
          console.log(`  ❌ ${item.rank}위 ${item.donor_name}: 업데이트 실패 - ${error.message}`)
        } else {
          console.log(`  ✅ ${item.rank}위 ${item.donor_name} → ${profileId.substring(0, 8)}...`)
          totalFixed++
        }
      } else {
        console.log(`  🔍 ${item.rank}위 ${item.donor_name} → ${profileId.substring(0, 8)}... (예정)`)
        totalFixed++
      }
    } else {
      console.log(`  ⚠️ ${item.rank}위 ${item.donor_name}: 매칭 프로필 없음`)
      totalSkipped++
    }
  }

  console.log(`\n  종합 랭킹: ${totalFixed}개 연결${dryRun ? ' 예정' : ''}, ${totalSkipped}개 스킵`)

  // 3. 시즌 랭킹 수정
  console.log('\n📌 시즌 1 랭킹 donor_id 연결:')
  const { data: seasonNulls } = await supabase
    .from('season_donation_rankings')
    .select('id, rank, donor_name')
    .eq('season_id', 1)
    .is('donor_id', null)
    .order('rank', { ascending: true })

  let seasonFixed = 0
  let seasonSkipped = 0

  for (const item of seasonNulls || []) {
    const profileId = nicknameToProfile.get(item.donor_name)

    if (profileId) {
      if (!dryRun) {
        const { error } = await supabase
          .from('season_donation_rankings')
          .update({ donor_id: profileId })
          .eq('id', item.id)

        if (error) {
          console.log(`  ❌ ${item.rank}위 ${item.donor_name}: 업데이트 실패 - ${error.message}`)
        } else {
          console.log(`  ✅ ${item.rank}위 ${item.donor_name} → ${profileId.substring(0, 8)}...`)
          seasonFixed++
        }
      } else {
        console.log(`  🔍 ${item.rank}위 ${item.donor_name} → ${profileId.substring(0, 8)}... (예정)`)
        seasonFixed++
      }
    } else {
      console.log(`  ⚠️ ${item.rank}위 ${item.donor_name}: 매칭 프로필 없음`)
      seasonSkipped++
    }
  }

  console.log(`\n  시즌 랭킹: ${seasonFixed}개 연결${dryRun ? ' 예정' : ''}, ${seasonSkipped}개 스킵`)

  // 4. 요약
  console.log('\n📊 총 요약:')
  console.log(`  - 종합 랭킹: ${totalFixed}개 연결, ${totalSkipped}개 매칭 실패`)
  console.log(`  - 시즌 랭킹: ${seasonFixed}개 연결, ${seasonSkipped}개 매칭 실패`)

  if (dryRun) {
    console.log('\n💡 실제 적용하려면 --dry-run 옵션 없이 실행하세요:')
    console.log('   npx tsx scripts/fix-donor-links.ts')
  }

  console.log('\n✅ donor_id 연결 작업 완료!')
}

main().catch(console.error)
