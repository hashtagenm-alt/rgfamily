/**
 * 에피소드별 후원 데이터 Import 스크립트
 *
 * CSV 파일을 donations 테이블에 임포트합니다.
 * 시즌 랭킹 업데이트는 별도로 update-season-rankings.ts 를 실행해야 합니다.
 *
 * 사용법:
 *   npx tsx scripts/import-episode-donations.ts --season=1 --episode=10 --file="./data/ep10.csv"
 *
 * 옵션:
 *   --season=<ID>      시즌 ID (필수)
 *   --episode=<번호>    에피소드 번호 (필수)
 *   --file=<경로>       CSV 파일 경로 (필수)
 *   --unit=<excel|crew> 팬클럽 소속 (선택, 기본값: excel)
 *   --dry-run           실제 저장하지 않고 미리보기만
 *   --no-finalize       에피소드 확정(is_finalized) 처리 안 함
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

interface CsvRow {
  donated_at: string
  donor_name: string
  amount: number
  target_bj: string
}

function parseArgs() {
  const args = process.argv.slice(2)
  let seasonId = 0
  let episodeNumber = 0
  let filePath = ''
  let unit: 'excel' | 'crew' = 'excel'
  let dryRun = false
  let noFinalize = false

  for (const arg of args) {
    if (arg.startsWith('--season=')) {
      seasonId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--episode=')) {
      episodeNumber = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--file=')) {
      filePath = arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')
    } else if (arg.startsWith('--unit=')) {
      const v = arg.split('=')[1].toLowerCase()
      if (v === 'excel' || v === 'crew') unit = v
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--no-finalize') {
      noFinalize = true
    }
  }

  if (!seasonId || !episodeNumber || !filePath) {
    console.error('사용법: npx tsx scripts/import-episode-donations.ts --season=<ID> --episode=<번호> --file=<CSV경로>')
    console.error('')
    console.error('예시:')
    console.error('  npx tsx scripts/import-episode-donations.ts --season=1 --episode=10 --file="./data/ep10.csv"')
    console.error('  npx tsx scripts/import-episode-donations.ts --season=1 --episode=10 --file="./data/ep10.csv" --dry-run')
    process.exit(1)
  }

  return { seasonId, episodeNumber, filePath, unit, dryRun, noFinalize }
}

function extractNickname(idWithNickname: string): string {
  const match = idWithNickname.match(/\(([^)]+)\)/)
  return match ? match[1] : idWithNickname
}

function cleanBjName(bjName: string): string {
  return bjName
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s*\([^)]+\)\s*$/g, '')
    .trim()
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(filePath: string): CsvRow[] {
  let content = fs.readFileSync(filePath, 'utf-8')
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1)

  const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i])
    if (parts.length < 4) continue

    const nickname = extractNickname(parts[1])
    const amount = parseInt(parts[2].replace(/,/g, ''), 10) || 0

    if (amount <= 0) continue
    if (nickname.includes('RG_family') || nickname.includes('대표BJ')) continue

    rows.push({
      donated_at: parts[0],
      donor_name: nickname,
      amount,
      target_bj: cleanBjName(parts[3]),
    })
  }

  return rows
}

async function main() {
  const { seasonId, episodeNumber, filePath, unit, dryRun, noFinalize } = parseArgs()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 에피소드 후원 데이터 Import')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   시즌: ${seasonId}`)
  console.log(`   에피소드: ${episodeNumber}화`)
  console.log(`   소속: ${unit}`)
  console.log(`   파일: ${path.basename(filePath)}`)
  if (dryRun) console.log('   ⚠️  DRY-RUN 모드')
  console.log('')

  // 에피소드 ID 조회
  const { data: episode } = await supabase
    .from('episodes')
    .select('id, episode_number, is_finalized, total_hearts, donor_count')
    .eq('season_id', seasonId)
    .eq('episode_number', episodeNumber)
    .single()

  if (!episode) {
    console.error(`❌ 에피소드를 찾을 수 없습니다: 시즌${seasonId} ${episodeNumber}화`)
    process.exit(1)
  }

  console.log(`   에피소드 ID: ${episode.id}`)
  if (episode.is_finalized) {
    console.log(`   ⚠️  이미 확정된 에피소드 (hearts: ${episode.total_hearts?.toLocaleString()}, donors: ${episode.donor_count})`)
  }

  // 파일 존재 확인
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${absolutePath}`)
    process.exit(1)
  }

  // CSV 파싱
  const rows = parseCSV(absolutePath)
  const totalHearts = rows.reduce((sum, r) => sum + r.amount, 0)
  const uniqueDonors = new Set(rows.map((r) => r.donor_name)).size

  console.log(`\n📊 CSV 파싱 결과:`)
  console.log(`   총 ${rows.length}건, ${totalHearts.toLocaleString()}하트, ${uniqueDonors}명`)

  // 기존 데이터 확인
  const { count: existingCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('episode_id', episode.id)

  if (existingCount && existingCount > 0) {
    console.log(`\n⚠️  기존 donations 데이터 ${existingCount}건 존재 → 삭제 후 재입력`)
  }

  // Top 10 미리보기
  const donorTotals = new Map<string, number>()
  for (const r of rows) {
    donorTotals.set(r.donor_name, (donorTotals.get(r.donor_name) || 0) + r.amount)
  }
  const sorted = [...donorTotals.entries()].sort((a, b) => b[1] - a[1])

  console.log(`\n📋 Top 10:`)
  sorted.slice(0, 10).forEach(([name, amount], i) => {
    console.log(`   ${i + 1}. ${name}: ${amount.toLocaleString()}하트`)
  })

  if (dryRun) {
    console.log('\n💡 실제 저장하려면 --dry-run 옵션 없이 실행하세요.')
    console.log('💡 저장 후 시즌 랭킹 갱신: npx tsx scripts/update-season-rankings.ts --season=1 --unit=excel')
    return
  }

  // 기존 데이터 삭제
  if (existingCount && existingCount > 0) {
    const { error } = await supabase.from('donations').delete().eq('episode_id', episode.id)
    if (error) {
      console.error('❌ 기존 데이터 삭제 실패:', error.message)
      process.exit(1)
    }
  }

  // 배치 Insert
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((row) => ({
      donor_name: row.donor_name,
      amount: row.amount,
      season_id: seasonId,
      episode_id: episode.id,
      unit,
      target_bj: row.target_bj || null,
      donated_at: row.donated_at || null,
    }))

    const { error } = await supabase.from('donations').insert(batch)
    if (error) {
      console.error(`   ❌ 배치 실패:`, error.message)
    } else {
      inserted += batch.length
    }
  }

  console.log(`\n✅ Import 완료: ${inserted}건`)

  // 에피소드 메타데이터 업데이트
  if (!noFinalize && inserted > 0) {
    const { error } = await supabase
      .from('episodes')
      .update({
        is_finalized: true,
        finalized_at: new Date().toISOString(),
        total_hearts: totalHearts,
        donor_count: uniqueDonors,
        source_file: path.basename(filePath),
      })
      .eq('id', episode.id)

    if (error) {
      console.error('   ⚠️  에피소드 확정 실패:', error.message)
    } else {
      console.log(`   📌 에피소드 확정: ${totalHearts.toLocaleString()}하트, ${uniqueDonors}명`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💡 다음 단계: 시즌 랭킹 갱신')
  console.log('   npx tsx scripts/update-season-rankings.ts --season=1 --unit=excel')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
