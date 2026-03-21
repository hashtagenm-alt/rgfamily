/**
 * 동일 인물 닉네임 중복 분석 스크립트
 */
import { getServiceClient } from '../lib/supabase'
const supabase = getServiceClient()

const duplicates = [
  ['가윤이꼬❤️가플단마음⭐', '가윤이꼬❤️마음⭐'],
  ['칰힌사주면천사❥', '☀칰힌사주면천사☀'],
  ['꽉B가윤이꼬❤️함주라', '가윤이꼬❤️함주라'],
  ['까부는김회장', '채은❤️여신'],
  ['[J]젖문가', '[Another]젖문가'],
]

async function main() {
  for (const [name1, name2] of duplicates) {
    console.log(`\n${'═'.repeat(50)}`)
    console.log(`🔍 "${name1}" vs "${name2}"`)
    console.log('═'.repeat(50))

    const { data: d1 } = await supabase.from('donations').select('donor_name, amount, episode_id').eq('donor_name', name1)
    const { data: d2 } = await supabase.from('donations').select('donor_name, amount, episode_id').eq('donor_name', name2)

    const sum1 = (d1 || []).reduce((s, r) => s + r.amount, 0)
    const sum2 = (d2 || []).reduce((s, r) => s + r.amount, 0)

    console.log(`\n📊 donations 테이블:`)
    console.log(`  "${name1}": ${(d1||[]).length}건, ${sum1.toLocaleString()} 하트`)
    console.log(`  "${name2}": ${(d2||[]).length}건, ${sum2.toLocaleString()} 하트`)
    console.log(`  합산: ${(d1||[]).length + (d2||[]).length}건, ${(sum1+sum2).toLocaleString()} 하트`)

    // 시즌 랭킹
    console.log(`\n📋 시즌 랭킹:`)
    const { data: sr } = await supabase.from('season_donation_rankings').select('rank, donor_name, total_amount').or(`donor_name.eq.${name1},donor_name.eq.${name2}`).order('rank')
    if ((sr||[]).length === 0) console.log('  (없음)')
    for (const r of sr || []) console.log(`  ${r.rank}위: ${r.donor_name} = ${r.total_amount.toLocaleString()} 하트`)

    // 종합 랭킹
    console.log(`\n📋 종합 랭킹:`)
    const { data: tr } = await supabase.from('total_donation_rankings').select('rank, donor_name, total_amount').or(`donor_name.eq.${name1},donor_name.eq.${name2}`).order('rank')
    if ((tr||[]).length === 0) console.log('  (없음)')
    for (const r of tr || []) console.log(`  ${r.rank}위: ${r.donor_name} = ${r.total_amount.toLocaleString()} 하트`)
  }
}
main().catch(console.error)
