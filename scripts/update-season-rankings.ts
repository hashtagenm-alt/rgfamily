/**
 * 시즌별 후원 랭킹 업데이트 스크립트
 *
 * CSV 파일들에서 후원 데이터를 읽어서 season_donation_rankings 테이블을 업데이트합니다.
 * RPC 함수를 사용하여 트랜잭션 안전성을 보장합니다.
 *
 * 사용법:
 *   npx tsx scripts/update-season-rankings.ts --season=1 --unit=excel --files="./data/ep1.csv,./data/ep2.csv"
 *
 * 옵션:
 *   --season=<ID>     시즌 ID (필수)
 *   --unit=<excel|crew>  팬클럽 소속 (선택, 기본값: null)
 *   --files=<파일들>   CSV 파일 경로들 (쉼표로 구분)
 *   --dry-run         실제 저장하지 않고 미리보기만
 */

import * as fs from 'fs'
import * as path from 'path'
import { getServiceClient, checkError } from './lib/supabase'
import { withRetry, printProgress } from './lib/utils'

const supabase = getServiceClient()

interface DonorData {
  nickname: string
  totalHearts: number
  donationCount: number
}

type Unit = 'excel' | 'crew' | null

function parseArgs(): { seasonId: number; filePaths: string[]; unit: Unit; dryRun: boolean } {
  const args = process.argv.slice(2)
  let seasonId = 1
  let filePaths: string[] = []
  let unit: Unit = null
  let dryRun = false

  for (const arg of args) {
    if (arg.startsWith('--season=')) {
      seasonId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--files=')) {
      const filesStr = arg.split('=')[1].replace(/^["']|["']$/g, '')
      filePaths = filesStr.split(',').map((f) => f.trim())
    } else if (arg.startsWith('--unit=')) {
      const unitValue = arg.split('=')[1].toLowerCase()
      if (unitValue === 'excel' || unitValue === 'crew') {
        unit = unitValue
      } else {
        console.error('❌ --unit은 excel 또는 crew만 가능합니다.')
        process.exit(1)
      }
    } else if (arg === '--dry-run') {
      dryRun = true
    }
  }

  if (filePaths.length === 0) {
    console.error('사용법: npx tsx scripts/update-season-rankings.ts --season=<ID> --unit=<excel|crew> --files=<CSV파일들>')
    process.exit(1)
  }

  return { seasonId, filePaths, unit, dryRun }
}

function extractNickname(idWithNickname: string): string {
  // 형식: "아이디(닉네임)" → 닉네임 추출
  const match = idWithNickname.match(/\(([^)]+)\)/)
  return match ? match[1] : idWithNickname
}

function parseDonationCsv(filePath: string): Map<string, DonorData> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${absolutePath}`)
    return new Map()
  }

  // BOM 제거 및 인코딩 처리
  let content = fs.readFileSync(absolutePath, 'utf-8')
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1)
  }

  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const donorMap = new Map<string, DonorData>()

  for (let i = 1; i < lines.length; i++) {
    // 따옴표 내 쉼표 처리
    const cols = parseCSVLine(lines[i])
    if (cols.length < 3) continue

    const idWithNickname = cols[1]
    const hearts = parseInt(cols[2].replace(/,/g, ''), 10) || 0

    if (hearts <= 0) continue

    const nickname = extractNickname(idWithNickname)

    // 시스템 계정 제외
    if (nickname.includes('RG_family') || nickname.includes('대표BJ')) continue

    const existing = donorMap.get(nickname)
    if (existing) {
      existing.totalHearts += hearts
      existing.donationCount += 1
    } else {
      donorMap.set(nickname, {
        nickname,
        totalHearts: hearts,
        donationCount: 1,
      })
    }
  }

  return donorMap
}

/**
 * CSV 라인 파싱 (따옴표 내 쉼표 처리)
 */
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

function mergeDonations(filePaths: string[]): DonorData[] {
  const mergedMap = new Map<string, DonorData>()

  for (const filePath of filePaths) {
    console.log(`📄 파싱 중: ${filePath}`)
    const donorMap = parseDonationCsv(filePath)

    for (const [nickname, data] of donorMap) {
      const existing = mergedMap.get(nickname)
      if (existing) {
        existing.totalHearts += data.totalHearts
        existing.donationCount += data.donationCount
      } else {
        mergedMap.set(nickname, { ...data })
      }
    }
  }

  return Array.from(mergedMap.values()).sort((a, b) => b.totalHearts - a.totalHearts)
}

async function upsertWithRPC(seasonId: number, unit: Unit, rankings: DonorData[]) {
  const rankingsJson = rankings.slice(0, 50).map((donor, index) => ({
    rank: index + 1,
    donor_name: donor.nickname,
    total_amount: donor.totalHearts,
    donation_count: donor.donationCount,
    unit: unit,
  }))

  console.log('\n📊 RPC 함수로 트랜잭션 실행 중...')

  const result = await withRetry(
    async () => {
      const { data, error } = await supabase.rpc('upsert_season_rankings', {
        p_season_id: seasonId,
        p_unit: unit,
        p_rankings: rankingsJson,
      })

      if (error) throw new Error(error.message)
      return data
    },
    {
      maxRetries: 3,
      onRetry: (error, attempt, delay) => {
        console.log(`   ⚠️  재시도 ${attempt}/3: ${error.message} (${delay}ms 대기)`)
      },
    }
  )

  return result
}

async function upsertWithFallback(seasonId: number, unit: Unit, rankings: DonorData[]) {
  const top50 = rankings.slice(0, 50)

  console.log('\n📊 폴백: 개별 쿼리로 업데이트 중...')

  // 1. 기존 데이터 삭제
  console.log(`🗑️  시즌 ${seasonId} ${unit ? `(${unit})` : '전체'} 기존 데이터 삭제...`)
  let deleteQuery = supabase
    .from('season_donation_rankings')
    .delete()
    .eq('season_id', seasonId)

  if (unit) {
    deleteQuery = deleteQuery.eq('unit', unit)
  }

  await withRetry(
    async () => {
      const { error } = await deleteQuery
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  // 2. 새 데이터 삽입
  console.log('📊 시즌 랭킹 데이터 삽입...')
  const insertData = top50.map((donor, index) => ({
    season_id: seasonId,
    rank: index + 1,
    donor_name: donor.nickname,
    total_amount: donor.totalHearts,
    donation_count: donor.donationCount,
    unit: unit,
    updated_at: new Date().toISOString(),
  }))

  await withRetry(
    async () => {
      const { error } = await supabase.from('season_donation_rankings').insert(insertData)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  return { inserted_count: top50.length, deleted_count: 0 }
}

async function backfillTopBj(seasonId: number) {
  console.log('\n🔄 top_bj 백필 중 (donations 테이블에서 집계)...')

  // 해당 시즌의 에피소드 ID 조회
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id')
    .eq('season_id', seasonId)

  if (!episodes || episodes.length === 0) {
    console.log('   ⚠️  에피소드 없음, top_bj 백필 건너뜀')
    return
  }

  const episodeIds = episodes.map((e) => e.id)

  // 해당 시즌 donations에서 donor별 target_bj 집계
  const allDonations: { donor_name: string; target_bj: string; amount: number }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, target_bj, amount')
      .in('episode_id', episodeIds)
      .not('target_bj', 'is', null)
      .gt('amount', 0)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error || !data || data.length === 0) break
    allDonations.push(...(data as { donor_name: string; target_bj: string; amount: number }[]))
    if (data.length < pageSize) break
    page++
  }

  // donor별 top_bj 계산
  const bjTotals: Record<string, Record<string, number>> = {}
  for (const d of allDonations) {
    if (!bjTotals[d.donor_name]) bjTotals[d.donor_name] = {}
    bjTotals[d.donor_name][d.target_bj] = (bjTotals[d.donor_name][d.target_bj] || 0) + d.amount
  }

  let updated = 0
  for (const [donor, bjs] of Object.entries(bjTotals)) {
    let maxBj: string | null = null
    let maxAmount = 0
    for (const [bj, amount] of Object.entries(bjs)) {
      if (amount > maxAmount) { maxAmount = amount; maxBj = bj }
    }
    if (maxBj) {
      const { error } = await supabase
        .from('season_donation_rankings')
        .update({ top_bj: maxBj })
        .eq('season_id', seasonId)
        .eq('donor_name', donor)
      if (!error) updated++
    }
  }

  console.log(`   ✅ ${updated}명 top_bj 업데이트`)
}

async function main() {
  console.log('🚀 시즌 랭킹 업데이트 시작\n')

  const { seasonId, filePaths, unit, dryRun } = parseArgs()

  console.log(`📌 시즌: ${seasonId}`)
  console.log(`📌 팬클럽: ${unit || '전체(미지정)'}`)

  if (dryRun) {
    console.log('⚠️  DRY-RUN 모드\n')
  }

  // 1. CSV 파일 병합
  console.log('📊 후원 데이터 집계 중...')
  const donors = mergeDonations(filePaths)
  console.log(`   총 ${donors.length}명 집계 완료`)

  if (donors.length === 0) {
    console.error('❌ 후원 데이터가 없습니다.')
    process.exit(1)
  }

  // 2. Top 50 추출
  const top50 = donors.slice(0, 50)

  console.log('\n📋 Top 10:')
  for (let i = 0; i < Math.min(10, top50.length); i++) {
    const d = top50[i]
    console.log(`   ${i + 1}. ${d.nickname}: ${d.totalHearts.toLocaleString()}하트 (${d.donationCount}건)`)
  }

  if (dryRun) {
    console.log('\n💡 실제 저장하려면 --dry-run 옵션 없이 실행하세요.')
    return
  }

  // 3. RPC 또는 폴백으로 업데이트
  try {
    const result = await upsertWithRPC(seasonId, unit, donors)
    console.log(`   ✅ 시즌 ${seasonId} Top 50 업데이트 완료! (RPC)`)
    if (result && result[0]) {
      console.log(`   📊 삭제: ${result[0].deleted_count}건, 삽입: ${result[0].inserted_count}건`)
    }
  } catch (rpcError) {
    console.log(`   ⚠️  RPC 실패, 폴백 실행: ${rpcError instanceof Error ? rpcError.message : rpcError}`)
    const result = await upsertWithFallback(seasonId, unit, donors)
    console.log(`   ✅ 시즌 ${seasonId} Top 50 업데이트 완료! (폴백)`)
    console.log(`   📊 삽입: ${result.inserted_count}건`)
  }

  // 4. top_bj 백필 (donations 테이블에서 자동 집계)
  await backfillTopBj(seasonId)
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
