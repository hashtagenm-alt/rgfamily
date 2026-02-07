/**
 * 에피소드 7화 데이터 임포트 및 랭킹 업데이트
 *
 * CSV 파일: /Users/bagjaeseog/Downloads/RG패밀리 엑셀부 시즌_내역_2026020419.csv
 * 에피소드: 시즌 1 / 7화 (직급전)
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import dotenv from 'dotenv'

const supabase = getServiceClient()

interface DonationRow {
  donated_at: string
  donor_name: string
  amount: number
  target_bj: string
}

/**
 * 아이디(닉네임) 형식에서 닉네임만 추출
 */
function extractNickname(idWithNickname: string): string {
  const match = idWithNickname.match(/\(([^)]+)\)/)
  return match ? match[1] : idWithNickname
}

/**
 * BJ 이름 정규화
 */
function normalizeBjName(bjName: string): string {
  // [역할] 이름 형식 처리
  const bracketMatch = bjName.match(/\[.*?\]\s*(.+)/)
  if (bracketMatch) {
    return bracketMatch[1].trim()
  }
  // 이름(역할) 형식 처리
  const parenMatch = bjName.match(/^([^(]+)\(/)
  if (parenMatch) {
    return parenMatch[1].trim()
  }
  return bjName.trim()
}

function parseCSV(filePath: string): DonationRow[] {
  console.log(`📄 CSV 파일 파싱 중: ${filePath}`)

  const content = fs.readFileSync(filePath, 'utf-8')
  const cleanContent = content.replace(/^\uFEFF/, '') // BOM 제거
  const lines = cleanContent.split('\n').filter(line => line.trim())

  // 헤더 스킵
  const dataLines = lines.slice(1)

  console.log(`   총 ${dataLines.length}줄 발견`)

  return dataLines.map(line => {
    const parts = line.split(',')

    const rawDonorName = parts[1]?.trim() || ''
    const nickname = extractNickname(rawDonorName)
    const targetBj = normalizeBjName(parts[3]?.trim() || '')

    return {
      donated_at: parts[0]?.trim() || '',
      donor_name: nickname,
      amount: parseInt(parts[2]?.trim() || '0', 10),
      target_bj: targetBj,
    }
  }).filter(row => row.donor_name && row.amount > 0)
}

async function importDonations(filePath: string, seasonId: number, episodeId: number) {
  console.log(`\n📥 에피소드 7화 데이터 임포트 시작...`)

  if (!fs.existsSync(filePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`)
    return 0
  }

  const rows = parseCSV(filePath)
  console.log(`   ✅ 파싱 완료: ${rows.length}건`)

  if (rows.length === 0) {
    console.error(`❌ 임포트할 데이터가 없습니다`)
    return 0
  }

  // 기존 데이터 확인
  const { count: existingCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('episode_id', episodeId)

  if (existingCount && existingCount > 0) {
    console.log(`   ⚠️  기존 데이터 ${existingCount}건 존재 - 삭제 후 재입력`)
    const { error: deleteError } = await supabase
      .from('donations')
      .delete()
      .eq('episode_id', episodeId)

    if (deleteError) {
      console.error(`   ❌ 기존 데이터 삭제 실패:`, deleteError)
      return 0
    }
  }

  // 데이터 변환
  const donationsToInsert = rows.map(row => ({
    season_id: seasonId,
    episode_id: episodeId,
    donor_name: row.donor_name,
    amount: row.amount,
    donated_at: row.donated_at,
    target_bj: row.target_bj,
    unit: 'excel' as const,
  }))

  // 배치 삽입 (100개씩)
  const batchSize = 100
  let insertedCount = 0

  console.log(`   💾 데이터 삽입 중... (${Math.ceil(donationsToInsert.length / batchSize)}개 배치)`)

  for (let i = 0; i < donationsToInsert.length; i += batchSize) {
    const batch = donationsToInsert.slice(i, i + batchSize)
    const { error } = await supabase.from('donations').insert(batch)

    if (error) {
      console.error(`   ❌ 배치 ${Math.floor(i / batchSize) + 1} 삽입 실패:`, error.message)
    } else {
      insertedCount += batch.length
    }
  }

  console.log(`   ✅ ${insertedCount}건 임포트 완료`)
  return insertedCount
}

async function updateEpisodeStats(episodeId: number) {
  console.log(`\n📊 에피소드 통계 업데이트 중...`)

  // 총 후원 하트 집계
  const { data: totalData, error: totalError } = await supabase
    .from('donations')
    .select('amount, donor_name')
    .eq('episode_id', episodeId)

  if (totalError) {
    console.error(`   ❌ 통계 조회 실패:`, totalError)
    return
  }

  const totalHearts = totalData?.reduce((sum, row) => sum + row.amount, 0) || 0
  const donorCount = new Set(totalData?.map(row => row.donor_name)).size

  // 에피소드 업데이트
  const { error: updateError } = await supabase
    .from('episodes')
    .update({
      total_hearts: totalHearts,
      donor_count: donorCount,
    })
    .eq('id', episodeId)

  if (updateError) {
    console.error(`   ❌ 에피소드 업데이트 실패:`, updateError)
    return
  }

  console.log(`   ✅ 총 후원 하트: ${totalHearts.toLocaleString()}`)
  console.log(`   ✅ 후원자 수: ${donorCount}명`)
}

async function updateSeasonRankings(seasonId: number) {
  console.log(`\n🏆 시즌 랭킹 업데이트 중...`)

  // RPC 함수 호출 (존재할 경우)
  const { data, error } = await supabase.rpc('refresh_season_rankings', {
    p_season_id: seasonId
  })

  if (error) {
    console.log(`   ⚠️  RPC 함수 호출 실패 (수동 업데이트 필요): ${error.message}`)
    return
  }

  console.log(`   ✅ 시즌 랭킹 업데이트 완료`)
}

async function updateTotalRankings() {
  console.log(`\n🏅 전체 랭킹 업데이트 중...`)

  // RPC 함수 호출 (존재할 경우)
  const { data, error } = await supabase.rpc('refresh_total_rankings')

  if (error) {
    console.log(`   ⚠️  RPC 함수 호출 실패 (수동 업데이트 필요): ${error.message}`)
    return
  }

  console.log(`   ✅ 전체 랭킹 업데이트 완료`)
}

async function verifyDataIntegrity(seasonId: number, episodeId: number) {
  console.log(`\n✅ 데이터 정합성 검사 중...`)

  // 1. donations 데이터 확인
  const { count: donationCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('episode_id', episodeId)

  console.log(`   📝 donations 테이블: ${donationCount}건`)

  // 2. 에피소드 정보 확인
  const { data: episode } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', episodeId)
    .single()

  if (episode) {
    console.log(`   📺 에피소드: ${episode.title}`)
    console.log(`   💰 총 후원: ${episode.total_hearts?.toLocaleString() || 0} 하트`)
    console.log(`   👥 후원자: ${episode.donor_count || 0}명`)
  }

  // 3. 시즌 랭킹 확인
  const { count: seasonRankingCount } = await supabase
    .from('season_donation_rankings')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId)

  console.log(`   🏆 시즌 랭킹: ${seasonRankingCount}명`)

  // 4. 전체 랭킹 확인
  const { count: totalRankingCount } = await supabase
    .from('total_donation_rankings')
    .select('*', { count: 'exact', head: true })

  console.log(`   🏅 전체 랭킹: ${totalRankingCount}명`)

  console.log(`\n   ✅ 데이터 정합성 검사 완료`)
}

async function main() {
  const csvFilePath = '/Users/bagjaeseog/Downloads/RG패밀리 엑셀부 시즌_내역_2026020419.csv'
  const seasonId = 1
  const episodeId = 18  // 에피소드 7화
  const episodeNumber = 7

  console.log('========================================')
  console.log('📥 에피소드 7화 데이터 임포트 및 업데이트')
  console.log('========================================')
  console.log(`CSV 파일: ${csvFilePath}`)
  console.log(`시즌: ${seasonId}, 에피소드: ${episodeNumber} (ID: ${episodeId})`)
  console.log('========================================')

  try {
    // 1. 데이터 임포트
    const importCount = await importDonations(csvFilePath, seasonId, episodeId)

    if (importCount === 0) {
      console.error('\n❌ 데이터 임포트 실패')
      return
    }

    // 2. 에피소드 통계 업데이트
    await updateEpisodeStats(episodeId)

    // 3. 시즌 랭킹 업데이트
    await updateSeasonRankings(seasonId)

    // 4. 전체 랭킹 업데이트
    await updateTotalRankings()

    // 5. 데이터 정합성 검사
    await verifyDataIntegrity(seasonId, episodeId)

    console.log('\n========================================')
    console.log('✅ 모든 작업 완료!')
    console.log('========================================')

  } catch (error) {
    console.error('\n❌ 오류 발생:', error)
    process.exit(1)
  }
}

main().catch(console.error)
