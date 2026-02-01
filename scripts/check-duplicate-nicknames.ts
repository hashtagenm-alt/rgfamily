/**
 * 닉네임 중복 확인 및 분석 테이블 체크
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  // 1. Check analysis tables
  console.log('=== 분석 관련 테이블 확인 ===')

  // Check episode_analysis table
  const { data: episodeAnalysis, error: eaError } = await supabase
    .from('episode_analysis')
    .select('*')
    .limit(5)

  if (eaError) {
    console.log('episode_analysis 테이블:', eaError.message)
  } else {
    console.log('episode_analysis 데이터:', episodeAnalysis?.length, '건')
  }

  // Check donation_analysis table
  const { data: donationAnalysis, error: daError } = await supabase
    .from('donation_analysis')
    .select('*')
    .limit(5)

  if (daError) {
    console.log('donation_analysis 테이블:', daError.message)
  } else {
    console.log('donation_analysis 데이터:', donationAnalysis?.length, '건')
  }

  // 2. Find duplicate nicknames with suffixes in season rankings
  console.log('\n=== 닉네임 중복 확인 (시즌 랭킹) ===')
  const { data: seasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('id, donor_name, total_amount')
    .eq('season_id', 1)
    .order('total_amount', { ascending: false })

  // Find patterns like (퇴근), (휴식), etc.
  const suffixPattern = /[\(（][^\)）]+[\)）]$/
  const duplicateCandidates: Record<string, { variations: { name: string, id: number, total: number }[] }> = {}

  for (const r of seasonRankings || []) {
    const baseName = r.donor_name.replace(suffixPattern, '').trim()
    if (baseName !== r.donor_name) {
      if (!duplicateCandidates[baseName]) {
        duplicateCandidates[baseName] = { variations: [] }
      }
      duplicateCandidates[baseName].variations.push({
        name: r.donor_name,
        id: r.id,
        total: r.total_amount
      })
    }
  }

  // Check if base name also exists
  for (const baseName of Object.keys(duplicateCandidates)) {
    const baseEntry = seasonRankings?.find(r => r.donor_name === baseName)
    if (baseEntry) {
      duplicateCandidates[baseName].variations.unshift({
        name: baseName,
        id: baseEntry.id,
        total: baseEntry.total_amount
      })
    }
  }

  console.log('\n괄호 접미사가 있는 닉네임 (병합 대상):')
  let mergeCount = 0
  for (const [base, data] of Object.entries(duplicateCandidates)) {
    if (data.variations.length > 1) {
      mergeCount++
      console.log(`\n  기본: "${base}"`)
      const totalSum = data.variations.reduce((sum, v) => sum + v.total, 0)
      data.variations.forEach((v) => {
        console.log(`    - "${v.name}" (id=${v.id}): ${v.total.toLocaleString()} 하트`)
      })
      console.log(`    → 병합 시 총액: ${totalSum.toLocaleString()} 하트`)
    }
  }
  console.log(`\n병합 필요 그룹: ${mergeCount}개`)

  // 3. Also check for similar names without parentheses
  console.log('\n=== 유사 닉네임 패턴 검색 ===')
  const allNames = seasonRankings?.map(r => r.donor_name) || []

  // Common variations to check
  const patterns = ['퇴근', '휴식', '출근', '방송중', '잠수']
  for (const pattern of patterns) {
    const matches = allNames.filter(name => name.includes(pattern))
    if (matches.length > 0) {
      console.log(`\n"${pattern}" 포함 닉네임:`)
      matches.forEach(name => {
        const entry = seasonRankings?.find(r => r.donor_name === name)
        console.log(`  - ${name}: ${entry?.total_amount.toLocaleString()} 하트`)
      })
    }
  }

  // 4. Check total rankings too
  console.log('\n=== 총 후원 랭킹 중복 확인 ===')
  const { data: totalRankings } = await supabase
    .from('total_donation_rankings')
    .select('id, donor_name, total_amount')
    .order('total_amount', { ascending: false })

  const totalDuplicates: Record<string, { variations: { name: string, id: number, total: number }[] }> = {}

  for (const r of totalRankings || []) {
    const baseName = r.donor_name.replace(suffixPattern, '').trim()
    if (baseName !== r.donor_name) {
      if (!totalDuplicates[baseName]) {
        totalDuplicates[baseName] = { variations: [] }
      }
      totalDuplicates[baseName].variations.push({
        name: r.donor_name,
        id: r.id,
        total: r.total_amount
      })
    }
  }

  for (const baseName of Object.keys(totalDuplicates)) {
    const baseEntry = totalRankings?.find(r => r.donor_name === baseName)
    if (baseEntry) {
      totalDuplicates[baseName].variations.unshift({
        name: baseName,
        id: baseEntry.id,
        total: baseEntry.total_amount
      })
    }
  }

  console.log('\n총 랭킹에서 병합 필요한 닉네임:')
  for (const [base, data] of Object.entries(totalDuplicates)) {
    if (data.variations.length > 1) {
      console.log(`\n  기본: "${base}"`)
      const totalSum = data.variations.reduce((sum, v) => sum + v.total, 0)
      data.variations.forEach((v) => {
        console.log(`    - "${v.name}" (id=${v.id}): ${v.total.toLocaleString()} 하트`)
      })
      console.log(`    → 병합 시 총액: ${totalSum.toLocaleString()} 하트`)
    }
  }
}

main().catch(console.error)
