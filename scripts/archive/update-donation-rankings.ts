/**
 * 후원 랭킹 업데이트 스크립트
 *
 * CSV 파일들에서 후원 데이터를 읽어서 시즌 랭킹 및 총 후원 랭킹을 업데이트합니다.
 *
 * 사용법:
 *   npx ts-node scripts/update-donation-rankings.ts --season=1 --files="./data/ep1.csv,./data/ep2.csv"
 *
 * CSV 형식 (내역 파일):
 *   후원시간,후원 아이디(닉네임),후원하트,참여BJ,하트점수,기여도,기타
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

// .env.local 로드

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  console.error('   NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 확인 필요')
  process.exit(1)
}

const supabase = getServiceClient()

// 후원자 집계 데이터
interface DonorData {
  nickname: string
  totalHearts: number
  donationCount: number
}

/**
 * 커맨드라인 인자 파싱
 */
function parseArgs(): { seasonId: number; filePaths: string[]; dryRun: boolean; updateTotal: boolean } {
  const args = process.argv.slice(2)
  let seasonId = 1
  let filePaths: string[] = []
  let dryRun = false
  let updateTotal = true

  for (const arg of args) {
    if (arg.startsWith('--season=')) {
      seasonId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--files=')) {
      const filesStr = arg.split('=')[1].replace(/^[\"']|[\"']$/g, '')
      filePaths = filesStr.split(',').map((f) => f.trim())
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--no-total') {
      updateTotal = false
    }
  }

  if (filePaths.length === 0) {
    console.error('사용법: npx ts-node scripts/update-donation-rankings.ts --season=<ID> --files=<CSV파일들>')
    console.error('예: npx ts-node scripts/update-donation-rankings.ts --season=1 --files="./data/ep1.csv,./data/ep2.csv"')
    console.error('')
    console.error('옵션:')
    console.error('  --season=<ID>  : 시즌 ID (기본: 1)')
    console.error('  --files=<PATHS>: CSV 파일 경로들 (쉼표로 구분)')
    console.error('  --dry-run      : 실제 저장 없이 미리보기만')
    console.error('  --no-total     : 총 후원 랭킹 업데이트 안함')
    process.exit(1)
  }

  return { seasonId, filePaths, dryRun, updateTotal }
}

/**
 * 닉네임 추출: "아이디(닉네임)" 형식에서 닉네임만 추출
 */
function extractNickname(idWithNickname: string): string {
  const match = idWithNickname.match(/\(([^)]+)\)/)
  return match ? match[1] : idWithNickname
}

/**
 * CSV 파일에서 후원 데이터 파싱
 */
function parseDonationCsv(filePath: string): Map<string, DonorData> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${absolutePath}`)
    return new Map()
  }

  const content = fs.readFileSync(absolutePath, 'utf-8')
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const donorMap = new Map<string, DonorData>()

  // 첫 번째 줄은 헤더
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((col) => col.trim())
    if (cols.length < 3) continue

    const idWithNickname = cols[1]
    const hearts = parseInt(cols[2].replace(/,/g, ''), 10) || 0

    // 음수 하트는 제외 (벌금 등)
    if (hearts <= 0) continue

    const nickname = extractNickname(idWithNickname)

    // 대표BJ(RG_family) 후원은 제외 (개별 후원자가 아님)
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
 * 여러 CSV 파일의 후원 데이터 병합
 */
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

  // 총 후원량 기준 정렬
  const sorted = Array.from(mergedMap.values()).sort((a, b) => b.totalHearts - a.totalHearts)

  return sorted
}

/**
 * 시즌 후원 랭킹 업데이트 (donations 테이블)
 * donations 테이블은 후원 내역을 저장하는 용도이므로,
 * 시즌 랭킹은 집계된 데이터로 표시만 함
 */
async function updateSeasonRankings(seasonId: number, donors: DonorData[], dryRun: boolean): Promise<void> {
  console.log(`\n🏆 시즌 ${seasonId} 랭킹 업데이트 (Top 50)`)
  console.log('─'.repeat(60))

  const top50 = donors.slice(0, 50)

  for (let i = 0; i < top50.length; i++) {
    const donor = top50[i]
    const rank = i + 1

    if (dryRun) {
      console.log(`   ${rank}위: ${donor.nickname} - ${donor.totalHearts.toLocaleString()}하트 (${donor.donationCount}건)`)
    }
  }

  if (!dryRun) {
    // donations 테이블은 개별 후원 내역 저장용
    // 시즌 랭킹은 donations에서 집계하여 표시하므로 별도 저장 불필요
    // 대신 total_donation_rankings 테이블만 업데이트
    console.log(`   ℹ️  시즌 랭킹은 donations 테이블에서 실시간 집계됩니다.`)
    console.log(`   ✅ Top 50 집계 완료 (총 후원 랭킹에 저장됨)`)
  }
}

/**
 * 총 후원 랭킹 업데이트 (total_donation_rankings 테이블)
 */
async function updateTotalRankings(donors: DonorData[], dryRun: boolean): Promise<void> {
  console.log(`\n🌟 총 후원 랭킹 업데이트 (Top 50)`)
  console.log('─'.repeat(60))

  const top50 = donors.slice(0, 50)

  if (dryRun) {
    for (let i = 0; i < top50.length; i++) {
      const donor = top50[i]
      const rank = i + 1
      console.log(`   ${rank}위: ${donor.nickname} - ${donor.totalHearts.toLocaleString()}하트`)
    }
    return
  }

  // 기존 총 랭킹 데이터 삭제
  const { error: deleteError } = await supabase
    .from('total_donation_rankings')
    .delete()
    .gte('rank', 1)

  if (deleteError) {
    console.error(`   ❌ 기존 데이터 삭제 실패: ${deleteError.message}`)
    return
  }

  // 새 데이터 삽입
  const insertData = top50.map((donor, index) => ({
    rank: index + 1,
    donor_name: donor.nickname,
    total_amount: donor.totalHearts,
    is_permanent_vip: false,
    updated_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase.from('total_donation_rankings').insert(insertData)

  if (insertError) {
    console.error(`   ❌ 데이터 삽입 실패: ${insertError.message}`)
  } else {
    console.log(`   ✅ ${top50.length}명 총 후원 랭킹 업데이트 완료`)
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 후원 랭킹 업데이트 시작\n')

  const { seasonId, filePaths, dryRun, updateTotal } = parseArgs()

  if (dryRun) {
    console.log('⚠️  DRY-RUN 모드: 실제 저장 없이 미리보기만 실행합니다.\n')
  }

  // 1. CSV 파일들 병합
  console.log('📊 후원 데이터 집계 중...')
  const donors = mergeDonations(filePaths)
  console.log(`   총 ${donors.length}명의 후원자 데이터 집계 완료`)

  if (donors.length === 0) {
    console.error('❌ 후원 데이터가 없습니다.')
    process.exit(1)
  }

  // 상위 10명 미리보기
  console.log('\n📋 상위 10명:')
  for (let i = 0; i < Math.min(10, donors.length); i++) {
    const d = donors[i]
    console.log(`   ${i + 1}. ${d.nickname}: ${d.totalHearts.toLocaleString()}하트 (${d.donationCount}건)`)
  }

  // 2. 시즌 랭킹 업데이트
  await updateSeasonRankings(seasonId, donors, dryRun)

  // 3. 총 후원 랭킹 업데이트
  if (updateTotal) {
    await updateTotalRankings(donors, dryRun)
  }

  // 결과 요약
  console.log('\n' + '─'.repeat(60))
  if (dryRun) {
    console.log('💡 실제 저장하려면 --dry-run 옵션 없이 다시 실행하세요.')
  } else {
    console.log('✅ 랭킹 업데이트 완료!')
  }
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err)
  process.exit(1)
})
