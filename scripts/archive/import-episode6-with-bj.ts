/**
 * 시즌 1 - 6화 데이터 Import (target_bj 포함)
 * BJ 이름 정규화 처리
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = getServiceClient()

interface DonationRecord {
  donorId: string
  donorName: string
  amount: number
  timestamp: string
  participatingBj: string
  targetBj: string // 정규화된 BJ 이름
}

// BJ 이름 정규화
function normalizeBjName(name: string): string {
  let normalized = name.trim()

  // 1. [직급] 제거: "[공주] 손밍" → "손밍"
  normalized = normalized.replace(/^\[[^\]]+\]\s*/, '')

  // 2. (상태) 제거: "키키 (병가)" → "키키"
  normalized = normalized.replace(/\s*[\(（][^\)）]+[\)）]$/, '')

  return normalized.trim()
}

function parseCSV(filePath: string): DonationRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').slice(1) // Skip header

  const records: DonationRecord[] = []

  for (const line of lines) {
    if (!line.trim()) continue

    const parts = line.split(',')
    if (parts.length < 5) continue

    const timestamp = parts[0]
    const donorIdNickname = parts[1]
    const amount = parseInt(parts[2], 10)
    const participatingBj = parts[3]

    // Extract nickname from format: id(nickname)
    let donorId = ''
    let donorName = ''
    const match = donorIdNickname.match(/^([^(]+)\((.+)\)$/)
    if (match) {
      donorId = match[1].trim()
      donorName = match[2].trim()
    } else {
      donorId = donorIdNickname.trim()
      donorName = donorIdNickname.trim()
    }

    // Normalize BJ name
    const targetBj = normalizeBjName(participatingBj)

    records.push({
      donorId,
      donorName,
      amount,
      timestamp,
      participatingBj,
      targetBj
    })
  }

  return records
}

async function main() {
  const csvPath = '/Users/bagjaeseog/Downloads/RG패밀리 엑셀부 시즌_내역_2026020103.csv'
  const seasonId = 1
  const episodeId = 17 // 6화

  console.log('=== 시즌 1 - 6화 데이터 Import (target_bj 포함) ===\n')

  // 1. Parse CSV
  const records = parseCSV(csvPath)
  console.log(`CSV 파싱 완료: ${records.length}건`)

  // 2. Show BJ name normalization
  console.log('\n=== BJ 이름 정규화 ===')
  const bjMapping: Record<string, string> = {}
  for (const r of records) {
    if (r.participatingBj && !bjMapping[r.participatingBj]) {
      bjMapping[r.participatingBj] = r.targetBj
    }
  }

  Object.entries(bjMapping).forEach(([original, normalized]) => {
    if (original !== normalized) {
      console.log(`  "${original}" → "${normalized}"`)
    }
  })

  // 3. Aggregate by BJ
  console.log('\n=== BJ별 후원 현황 (6화) ===')
  const bjStats: Record<string, { hearts: number, count: number }> = {}
  for (const r of records) {
    if (!bjStats[r.targetBj]) {
      bjStats[r.targetBj] = { hearts: 0, count: 0 }
    }
    bjStats[r.targetBj].hearts += r.amount
    bjStats[r.targetBj].count += 1
  }

  Object.entries(bjStats)
    .sort((a, b) => b[1].hearts - a[1].hearts)
    .forEach(([bj, stats]) => {
      console.log(`  ${bj}: ${stats.hearts.toLocaleString()} 하트 (${stats.count}건)`)
    })

  // 4. Insert donations with target_bj
  console.log('\n=== donations 테이블에 삽입 ===')

  // First, clear existing episode 6 donations (if any)
  const { error: deleteError, count: deleteCount } = await supabase
    .from('donations')
    .delete()
    .eq('episode_id', episodeId)

  if (deleteError) {
    console.error('삭제 오류:', deleteError)
  } else {
    console.log(`기존 6화 후원 데이터 삭제: ${deleteCount || 0}건`)
  }

  // Prepare batch inserts
  const donationsToInsert = records.map(r => ({
    season_id: seasonId,
    episode_id: episodeId,
    donor_name: r.donorName,
    amount: r.amount,
    target_bj: r.targetBj,
    donated_at: r.timestamp
  }))

  // Insert in batches of 100
  const batchSize = 100
  let insertedCount = 0

  for (let i = 0; i < donationsToInsert.length; i += batchSize) {
    const batch = donationsToInsert.slice(i, i + batchSize)
    const { error: insertError } = await supabase
      .from('donations')
      .insert(batch)

    if (insertError) {
      console.error(`배치 ${Math.floor(i / batchSize) + 1} 삽입 오류:`, insertError)
    } else {
      insertedCount += batch.length
    }
  }

  console.log(`donations 테이블 삽입 완료: ${insertedCount}건`)

  // 5. Verify
  const { count: verifyCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('episode_id', episodeId)

  console.log(`\n검증 - 6화 후원 데이터: ${verifyCount}건`)

  console.log('\n✅ 완료!')
}

main().catch(console.error)
