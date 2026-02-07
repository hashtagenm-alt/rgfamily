/**
 * 레거시 데이터 마이그레이션 스크립트
 *
 * 하드코딩된 레거시 후원 데이터를 legacy_donation_totals 테이블로 이관합니다.
 *
 * 사용법:
 *   npx tsx scripts/migrate-legacy-data.ts [--dry-run]
 *
 * 주의:
 *   - 이 스크립트 실행 전 반드시 마이그레이션 SQL을 먼저 실행해야 합니다.
 *   - supabase/migrations/20260203_add_legacy_donation_totals.sql
 */

import { getServiceClient } from './lib/supabase'
import { withRetry } from './lib/utils'

const supabase = getServiceClient()

// 레거시 데이터 (시즌1 이전 누적)
// 원본: scripts/refresh-total-rankings.ts
const legacyData: Record<string, number> = {
  '미키™': 322030,
  '손밍매니아': 0,
  '❥CaNnOt': 59632,
  '쩔어서짜다': 0,
  '[RG]미드굿♣️가애': 73532,
  '[RG]✨린아의발굴™': 23711,
  '한세아내꺼♡호랭이': 0,
  '린아사단✨탱커': 18068,
  '까부는넌내꺼야119': 0,
  '농심육개장라면': 84177,
  'Rearcar': 0,
  '❥교미': 4499,
  '사랑해씌발™': 0,
  '[A]젖문가': 0,
  '청아❤️머리크기빵빵이': 0,
  '한세아♡백작♡하얀만두피': 50023,
  '희영네개유오': 50000,
  '시라☆구구단☆시우': 48720,
  '태린공주❤️줄여보자': 46926,
  '⭐건빵이미래쥐': 42395,
  '가윤이꼬❤️털이': 36971,
  '❤️지수ෆ해린❤️치토스㉦': 36488,
  '내마지막은키르❤️머네로': 36312,
  '내가바로원픽': 34270,
  '✨바위늪✨': 32492,
  'FA진스': 30533,
  '홍서하네홍금보': 29150,
  'qldh라유': 28844,
  '이쁘면하트100개': 25189,
  '고다혜보다ღ국물': 21311,
  '언제나♬': 20873,
  '한은비ღ안줘ღ': 20727,
  '☾코코에르메스': 20070,
  '양재동ღ젖문가⁀➷': 20009,
  '[RG]린아네☀둥그레': 18433,
  '미쯔✨': 18279,
  '개호구⭐즈하⭐광대': 18015,
  '퉁퉁퉁퉁퉁퉁사우르': 17266,
  '홍서하네❥페르소나™': 15950,
  '앵겨라잉': 15588,
  '태린공주❤️마비™': 15240,
  '[로진]앙보름_엔터대표': 15209,
  '[SD]티모': 14709,
}

async function checkTableExists(): Promise<boolean> {
  const { data, error } = await supabase
    .from('legacy_donation_totals')
    .select('id')
    .limit(1)

  // 테이블이 없으면 에러 발생
  if (error && error.message.includes('does not exist')) {
    return false
  }

  return true
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 레거시 데이터 마이그레이션')
  if (dryRun) console.log('⚠️  DRY-RUN 모드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. 테이블 존재 여부 확인
  console.log('📋 테이블 존재 여부 확인...')
  const tableExists = await checkTableExists()

  if (!tableExists) {
    console.error('❌ legacy_donation_totals 테이블이 존재하지 않습니다.')
    console.error('   먼저 마이그레이션 SQL을 실행해주세요:')
    console.error('   supabase/migrations/20260203_add_legacy_donation_totals.sql')
    process.exit(1)
  }
  console.log('   ✅ 테이블 확인됨')

  // 2. 기존 데이터 확인
  console.log('\n📊 기존 데이터 확인...')
  const { data: existingData, count } = await supabase
    .from('legacy_donation_totals')
    .select('donor_name, total_amount', { count: 'exact' })

  console.log(`   기존 데이터: ${count || 0}건`)

  // 3. 이관할 데이터 준비
  const entries = Object.entries(legacyData)
  console.log(`\n📋 이관할 데이터: ${entries.length}건`)

  // 0보다 큰 데이터만 필터링
  const nonZeroEntries = entries.filter(([, amount]) => amount > 0)
  console.log(`   0보다 큰 데이터: ${nonZeroEntries.length}건`)

  // 미리보기
  console.log('\n📋 이관할 Top 10:')
  const sorted = nonZeroEntries.sort((a, b) => b[1] - a[1])
  for (let i = 0; i < Math.min(10, sorted.length); i++) {
    const [name, amount] = sorted[i]
    console.log(`   ${i + 1}. ${name}: ${amount.toLocaleString()} 하트`)
  }

  if (dryRun) {
    console.log('\n💡 실제 이관하려면 --dry-run 옵션 없이 실행하세요.')
    return
  }

  // 4. 기존 데이터 삭제 (upsert 전 깔끔하게)
  console.log('\n🗑️  기존 데이터 삭제...')
  await withRetry(
    async () => {
      const { error } = await supabase
        .from('legacy_donation_totals')
        .delete()
        .gte('id', 0)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  // 5. 데이터 삽입
  console.log('📊 레거시 데이터 삽입...')
  const insertData = nonZeroEntries.map(([donor_name, total_amount]) => ({
    donor_name,
    total_amount,
    note: '시즌1 이전 누적 데이터',
  }))

  await withRetry(
    async () => {
      const { error } = await supabase.from('legacy_donation_totals').insert(insertData)
      if (error) throw new Error(error.message)
    },
    {
      maxRetries: 3,
      onRetry: (error, attempt, delay) => {
        console.log(`   ⚠️  재시도 ${attempt}/3: ${error.message} (${delay}ms 대기)`)
      },
    }
  )

  console.log(`   ✅ ${insertData.length}건 삽입 완료`)

  // 6. 결과 확인
  console.log('\n📊 이관 결과 확인:')
  const { data: result } = await supabase
    .from('legacy_donation_totals')
    .select('donor_name, total_amount')
    .order('total_amount', { ascending: false })
    .limit(10)

  for (const r of result || []) {
    console.log(`   ${r.donor_name}: ${r.total_amount.toLocaleString()} 하트`)
  }

  const { count: finalCount } = await supabase
    .from('legacy_donation_totals')
    .select('id', { count: 'exact', head: true })

  console.log(`\n📊 총 ${finalCount}건 이관 완료`)
  console.log('\n✅ 레거시 데이터 마이그레이션 완료!')
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
