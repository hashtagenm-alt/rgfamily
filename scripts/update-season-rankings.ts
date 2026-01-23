/**
 * 시즌별 후원 랭킹 업데이트 스크립트
 *
 * CSV 파일들에서 후원 데이터를 읽어서 season_donation_rankings 테이블을 업데이트합니다.
 *
 * 사용법:
 *   npx ts-node scripts/update-season-rankings.ts --season=1 --files="./data/ep1.csv,./data/ep2.csv"
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

interface DonorData {
  nickname: string
  totalHearts: number
  donationCount: number
}

function parseArgs(): { seasonId: number; filePaths: string[]; dryRun: boolean } {
  const args = process.argv.slice(2)
  let seasonId = 1
  let filePaths: string[] = []
  let dryRun = false

  for (const arg of args) {
    if (arg.startsWith('--season=')) {
      seasonId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--files=')) {
      const filesStr = arg.split('=')[1].replace(/^["']|["']$/g, '')
      filePaths = filesStr.split(',').map((f) => f.trim())
    } else if (arg === '--dry-run') {
      dryRun = true
    }
  }

  if (filePaths.length === 0) {
    console.error('사용법: npx ts-node scripts/update-season-rankings.ts --season=<ID> --files=<CSV파일들>')
    process.exit(1)
  }

  return { seasonId, filePaths, dryRun }
}

function extractNickname(idWithNickname: string): string {
  const match = idWithNickname.match(/\(([^)]+)\)/)
  return match ? match[1] : idWithNickname
}

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

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((col) => col.trim())
    if (cols.length < 3) continue

    const idWithNickname = cols[1]
    const hearts = parseInt(cols[2].replace(/,/g, ''), 10) || 0

    if (hearts <= 0) continue

    const nickname = extractNickname(idWithNickname)

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

async function main() {
  console.log('🚀 시즌 랭킹 업데이트 시작\n')

  const { seasonId, filePaths, dryRun } = parseArgs()

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

  // 3. 기존 데이터 삭제
  console.log(`\n🗑️  시즌 ${seasonId} 기존 데이터 삭제...`)
  const { error: deleteError } = await supabase
    .from('season_donation_rankings')
    .delete()
    .eq('season_id', seasonId)

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message)
    process.exit(1)
  }

  // 4. 새 데이터 삽입
  console.log('📊 시즌 랭킹 데이터 삽입...')
  const insertData = top50.map((donor, index) => ({
    season_id: seasonId,
    rank: index + 1,
    donor_name: donor.nickname,
    total_amount: donor.totalHearts,
    donation_count: donor.donationCount,
    updated_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase
    .from('season_donation_rankings')
    .insert(insertData)

  if (insertError) {
    console.error('❌ 삽입 실패:', insertError.message)
    process.exit(1)
  }

  console.log(`   ✅ 시즌 ${seasonId} Top 50 업데이트 완료!`)
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
