import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CsvRow {
  donated_at: string
  donor_raw: string
  donor_name: string
  pandatv_id: string
  amount: number
  target_bj: string
  heart_score: number
  contribution: number
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  // Skip header
  return lines.slice(1).map((line) => {
    const cols = line.split(',')
    const donorRaw = cols[1]
    // Extract nickname from parentheses: zhffkzhffk111(닉네임) → 닉네임
    const nickMatch = donorRaw.match(/\((.+)\)/)
    const nickname = nickMatch ? nickMatch[1] : donorRaw
    // Extract pandatv_id: zhffkzhffk111(닉네임) → zhffkzhffk111
    const idMatch = donorRaw.match(/^([^(]+)/)
    const pandatvId = idMatch ? idMatch[1] : donorRaw

    return {
      donated_at: cols[0],
      donor_raw: donorRaw,
      donor_name: nickname,
      pandatv_id: pandatvId,
      amount: parseInt(cols[2]) || 0,
      target_bj: cols[3] || '',
      heart_score: parseInt(cols[4]) || 0,
      contribution: parseInt(cols[5]) || 0,
    }
  })
}

async function importDonations(filePath: string, episodeId: number, label: string) {
  console.log(`\n📥 ${label} import 시작...`)
  console.log(`   파일: ${filePath}`)
  console.log(`   에피소드 ID: ${episodeId}`)

  const rows = parseCsv(filePath)
  console.log(`   CSV 행 수: ${rows.length}`)

  // Map to donations table format
  const donations = rows.map((row) => ({
    donor_name: row.donor_name,
    amount: row.amount,
    season_id: 1,
    episode_id: episodeId,
    unit: 'crew' as const,
    target_bj: row.target_bj || null,
    donated_at: row.donated_at,
  }))

  // Batch insert (100 rows at a time)
  let inserted = 0
  const batchSize = 100
  for (let i = 0; i < donations.length; i += batchSize) {
    const batch = donations.slice(i, i + batchSize)
    const { error } = await supabase.from('donations').insert(batch)
    if (error) {
      console.error(`   ❌ 배치 ${i}-${i + batch.length} 실패:`, error.message)
      return
    }
    inserted += batch.length
  }

  console.log(`   ✅ ${inserted}건 삽입 완료`)

  // Summary stats
  const totalHearts = rows.reduce((s, r) => s + r.amount, 0)
  const uniqueDonors = new Set(rows.map((r) => r.donor_name)).size
  console.log(`   총 하트: ${totalHearts.toLocaleString()}`)
  console.log(`   고유 후원자: ${uniqueDonors}명`)
}

async function main() {
  console.log('🚀 크루부 시즌1 후원 데이터 import')
  console.log('═'.repeat(50))

  const basePath = '/Users/bagjaeseog/Downloads/크루부 랭킹데이터'

  await importDonations(
    `${basePath}/RG패밀리 크루부 시즌_내역_2026032014.csv`,
    30, // 크루부 1화
    '크루부 시즌1 1화'
  )

  await importDonations(
    `${basePath}/RG패밀리 크루부 시즌_내역_2026032014 (1).csv`,
    31, // 크루부 2화
    '크루부 시즌1 2화'
  )

  // Final verification
  console.log('\n═'.repeat(50))
  console.log('📊 최종 검증')

  const { count: crewDonations } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('unit', 'crew')
  console.log(`   크루부 donations 총 수: ${crewDonations}`)

  const { data: byEp } = await supabase.from('donations').select('episode_id').eq('unit', 'crew')
  const ep30 = byEp?.filter((d) => d.episode_id === 30).length || 0
  const ep31 = byEp?.filter((d) => d.episode_id === 31).length || 0
  console.log(`   1화(ep30): ${ep30}건`)
  console.log(`   2화(ep31): ${ep31}건`)
}

main()
