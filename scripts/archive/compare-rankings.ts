import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'
import fs from 'fs'

const supabase = getServiceClient()

async function main() {
  // CSV 파싱
  const csvContent = fs.readFileSync('/Users/bagjaeseog/Downloads/제목 없는 스프레드시트 - 시트1.csv', 'utf-8')
  const lines = csvContent.trim().split('\n').slice(2) // 헤더 2줄 스킵

  const csvData = lines.map(line => {
    const parts = line.split(',')
    return {
      rank: parseInt(parts[1]),
      donor_name: parts[2]?.trim(),
      total_amount: parseInt(parts[3])
    }
  }).filter(d => d.rank && d.donor_name)

  // DB 데이터 조회
  const { data: dbData, error } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank', { ascending: true })
    .limit(50)

  if (error) {
    console.error('DB 조회 실패:', error.message)
    return
  }

  console.log('═══════════════════════════════════════════════════════════════════════════')
  console.log('📊 종합랭킹 데이터 정합성 분석')
  console.log('═══════════════════════════════════════════════════════════════════════════\n')

  // 불일치 분석
  const csvMap = new Map(csvData.map(d => [d.donor_name, d]))
  const dbMap = new Map((dbData || []).map(d => [d.donor_name, d]))

  // CSV에만 있는 사용자
  const csvOnly = csvData.filter(c => {
    return dbMap.has(c.donor_name) === false
  })

  // DB에만 있는 사용자
  const dbOnly = (dbData || []).filter(d => {
    return csvMap.has(d.donor_name) === false
  })

  // 둘 다 있지만 데이터 다른 경우
  const different = csvData.filter(c => {
    const db = dbMap.get(c.donor_name)
    if (db === undefined) return false
    return db.rank !== c.rank || db.total_amount !== c.total_amount
  })

  console.log('🔴 CSV에만 있음 (DB에 추가 필요):')
  for (const c of csvOnly) {
    console.log(`   ${c.rank}위: ${c.donor_name} (${c.total_amount.toLocaleString()} 하트)`)
  }

  console.log('\n🟡 DB에만 있음 (CSV에 없음):')
  for (const d of dbOnly) {
    console.log(`   ${d.rank}위: ${d.donor_name} (${d.total_amount.toLocaleString()} 하트)`)
  }

  console.log('\n🟠 순위/하트 불일치:')
  for (const c of different) {
    const db = dbMap.get(c.donor_name)!
    const changes: string[] = []
    if (c.rank !== db.rank) changes.push(`순위: ${db.rank}→${c.rank}`)
    if (c.total_amount !== db.total_amount) changes.push(`하트: ${db.total_amount.toLocaleString()}→${c.total_amount.toLocaleString()}`)
    console.log(`   ${c.donor_name}: ${changes.join(', ')}`)
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════')
  console.log('📈 요약')
  console.log('═══════════════════════════════════════════════════════════════════════════')
  console.log(`• CSV에만 있음: ${csvOnly.length}명`)
  console.log(`• DB에만 있음: ${dbOnly.length}명`)
  console.log(`• 데이터 불일치: ${different.length}명`)
  console.log(`• 정상: ${csvData.length - csvOnly.length - different.length}명`)

  // CSV 전체 데이터 출력 (업데이트용)
  console.log('\n═══════════════════════════════════════════════════════════════════════════')
  console.log('📋 CSV 전체 데이터 (업데이트 대상)')
  console.log('═══════════════════════════════════════════════════════════════════════════')
  for (const c of csvData) {
    console.log(`${c.rank}|${c.donor_name}|${c.total_amount}`)
  }
}

main().catch(console.error)
