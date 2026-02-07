/**
 * 동일 인물 닉네임 통합 스크립트
 * donations 테이블에서 구닉네임 → 대표닉네임으로 변경
 */
import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

const merges: [string, string][] = [
  ['가윤이꼬❤️가플단마음⭐', '가윤이꼬❤️마음⭐'],
  ['칰힌사주면천사❥', '☀칰힌사주면천사☀'],
  ['꽉B가윤이꼬❤️함주라', '가윤이꼬❤️함주라'],
  ['까부는김회장', '채은❤️여신'],
  ['[Another]젖문가', '[J]젖문가'],
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 동일 인물 닉네임 통합')
  if (dryRun) console.log('⚠️  DRY-RUN 모드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  let totalUpdated = 0

  for (const [oldName, newName] of merges) {
    const { data: records } = await supabase
      .from('donations')
      .select('id')
      .eq('donor_name', oldName)

    const count = (records || []).length
    console.log(`  "${oldName}" → "${newName}": ${count}건`)

    if (count > 0 && !dryRun) {
      const { error } = await supabase
        .from('donations')
        .update({ donor_name: newName })
        .eq('donor_name', oldName)

      if (error) {
        console.log(`    ❌ 오류: ${error.message}`)
      } else {
        console.log(`    ✅ ${count}건 업데이트 완료`)
        totalUpdated += count
      }
    }
  }

  console.log(`\n📊 총 ${totalUpdated}건 업데이트`)
  if (dryRun) console.log('💡 실제 실행하려면 --dry-run 없이 실행하세요.')
}

main().catch(console.error)
