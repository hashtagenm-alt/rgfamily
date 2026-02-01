/**
 * 시즌 1 - 6화 데이터 Import 및 랭킹 업데이트
 * CSV 파일을 파싱하여 donations 테이블에 추가하고
 * season_donation_rankings, total_donation_rankings 업데이트
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey)

interface DonationRecord {
  donorId: string
  donorName: string
  amount: number
  timestamp: string
  participatingBj: string
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
    const match = donorIdNickname.match(/^([^(]+)\((.+)\)$/)
    if (match) {
      const [, donorId, donorName] = match
      records.push({
        donorId: donorId.trim(),
        donorName: donorName.trim(),
        amount,
        timestamp,
        participatingBj
      })
    } else {
      // If no parentheses, use the whole string as nickname
      records.push({
        donorId: donorIdNickname.trim(),
        donorName: donorIdNickname.trim(),
        amount,
        timestamp,
        participatingBj
      })
    }
  }

  return records
}

async function main() {
  const csvPath = '/Users/bagjaeseog/Downloads/RG패밀리 엑셀부 시즌_내역_2026020103.csv'
  const seasonId = 1
  const episodeId = 17 // 6화

  console.log('=== 시즌 1 - 6화 데이터 Import 시작 ===\n')

  // 1. Parse CSV
  const records = parseCSV(csvPath)
  console.log(`CSV 파싱 완료: ${records.length}건`)

  // 2. Aggregate by donor
  const donorTotals: Record<string, { donorName: string, total: number, count: number }> = {}

  for (const record of records) {
    if (!donorTotals[record.donorName]) {
      donorTotals[record.donorName] = { donorName: record.donorName, total: 0, count: 0 }
    }
    donorTotals[record.donorName].total += record.amount
    donorTotals[record.donorName].count += 1
  }

  const donorList = Object.values(donorTotals).sort((a, b) => b.total - a.total)
  console.log(`\n고유 후원자 수: ${donorList.length}명`)
  console.log('\n=== 6화 Top 20 ===')
  donorList.slice(0, 20).forEach((d, i) => {
    console.log(`${i + 1}. ${d.donorName}: ${d.total.toLocaleString()} 하트 (${d.count}회)`)
  })

  // 3. Get existing season rankings
  const { data: existingSeasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('id, donor_name, total_amount, donation_count')
    .eq('season_id', seasonId)

  const existingSeasonMap: Record<string, { id: number, total: number, count: number }> = {}
  existingSeasonRankings?.forEach(r => {
    existingSeasonMap[r.donor_name] = { id: r.id, total: r.total_amount, count: r.donation_count }
  })

  console.log(`\n기존 시즌 랭킹 데이터: ${existingSeasonRankings?.length || 0}명`)

  // 4. Get existing total rankings
  const { data: existingTotalRankings } = await supabase
    .from('total_donation_rankings')
    .select('id, donor_name, total_amount')

  const existingTotalMap: Record<string, { id: number, total: number }> = {}
  existingTotalRankings?.forEach(r => {
    existingTotalMap[r.donor_name] = { id: r.id, total: r.total_amount }
  })

  console.log(`기존 총 랭킹 데이터: ${existingTotalRankings?.length || 0}명`)

  // 5. Update season rankings
  console.log('\n=== 시즌 랭킹 업데이트 ===')

  const seasonUpdates: any[] = []
  const seasonInserts: any[] = []

  for (const donor of donorList) {
    const existing = existingSeasonMap[donor.donorName]
    if (existing) {
      // Update existing
      seasonUpdates.push({
        id: existing.id,
        total_amount: existing.total + donor.total,
        donation_count: existing.count + donor.count
      })
    } else {
      // Insert new
      seasonInserts.push({
        season_id: seasonId,
        donor_name: donor.donorName,
        total_amount: donor.total,
        donation_count: donor.count,
        unit: 'excel' // 엑셀부 시즌
      })
    }
  }

  // Execute season updates
  for (const update of seasonUpdates) {
    const { error } = await supabase
      .from('season_donation_rankings')
      .update({ total_amount: update.total_amount, donation_count: update.donation_count })
      .eq('id', update.id)

    if (error) console.error('Season update error:', error)
  }
  console.log(`시즌 랭킹 업데이트: ${seasonUpdates.length}명`)

  // Execute season inserts
  if (seasonInserts.length > 0) {
    const { error } = await supabase
      .from('season_donation_rankings')
      .insert(seasonInserts)

    if (error) console.error('Season insert error:', error)
    console.log(`시즌 랭킹 신규 추가: ${seasonInserts.length}명`)
  }

  // 6. Recalculate season ranks
  const { data: updatedSeasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('id, donor_name, total_amount')
    .eq('season_id', seasonId)
    .order('total_amount', { ascending: false })

  // Update ranks
  for (let i = 0; i < (updatedSeasonRankings?.length || 0); i++) {
    const { error } = await supabase
      .from('season_donation_rankings')
      .update({ rank: i + 1 })
      .eq('id', updatedSeasonRankings![i].id)

    if (error) console.error('Rank update error:', error)
  }
  console.log(`시즌 랭킹 순위 재계산: ${updatedSeasonRankings?.length}명`)

  // 7. Update total rankings
  console.log('\n=== 총 후원 랭킹 업데이트 ===')

  const totalUpdates: any[] = []
  const totalInserts: any[] = []

  for (const donor of donorList) {
    const existing = existingTotalMap[donor.donorName]
    if (existing) {
      // Update existing
      totalUpdates.push({
        id: existing.id,
        total_amount: existing.total + donor.total
      })
    } else {
      // Insert new
      totalInserts.push({
        donor_name: donor.donorName,
        total_amount: donor.total
      })
    }
  }

  // Execute total updates
  for (const update of totalUpdates) {
    const { error } = await supabase
      .from('total_donation_rankings')
      .update({ total_amount: update.total_amount })
      .eq('id', update.id)

    if (error) console.error('Total update error:', error)
  }
  console.log(`총 랭킹 업데이트: ${totalUpdates.length}명`)

  // Execute total inserts
  if (totalInserts.length > 0) {
    const { error } = await supabase
      .from('total_donation_rankings')
      .insert(totalInserts)

    if (error) console.error('Total insert error:', error)
    console.log(`총 랭킹 신규 추가: ${totalInserts.length}명`)
  }

  // 8. Recalculate total ranks (only top 50)
  const { data: updatedTotalRankings } = await supabase
    .from('total_donation_rankings')
    .select('id, donor_name, total_amount')
    .order('total_amount', { ascending: false })
    .limit(50)

  // Update ranks for top 50
  for (let i = 0; i < (updatedTotalRankings?.length || 0); i++) {
    const { error } = await supabase
      .from('total_donation_rankings')
      .update({ rank: i + 1 })
      .eq('id', updatedTotalRankings![i].id)

    if (error) console.error('Total rank update error:', error)
  }
  console.log(`총 랭킹 순위 재계산: Top ${updatedTotalRankings?.length}`)

  // 9. Show final results
  console.log('\n=== 업데이트 후 시즌 랭킹 Top 20 ===')
  const { data: finalSeasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('season_id', seasonId)
    .order('rank')
    .limit(20)

  console.table(finalSeasonRankings)

  console.log('\n=== 업데이트 후 총 후원 랭킹 Top 20 ===')
  const { data: finalTotalRankings } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')
    .limit(20)

  console.table(finalTotalRankings)

  console.log('\n✅ 완료!')
}

main().catch(console.error)
