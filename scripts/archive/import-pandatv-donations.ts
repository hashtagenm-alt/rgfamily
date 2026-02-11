/**
 * PandaTV 후원 데이터 Import 스크립트
 * 
 * Downloads 폴더의 CSV 파일을 donations 테이블에 임포트
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
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
 * 예: "srvllo(르큐리)" → "르큐리"
 */
function extractNickname(idWithNickname: string): string {
  const match = idWithNickname.match(/\(([^)]+)\)/)
  return match ? match[1] : idWithNickname
}

/**
 * BJ 이름 정규화: 직급 태그 + 칭호/상태 접미사 제거
 * 예: "[시녀장] 청아" → "청아", "RG_family(대표BJ)" → "RG_family"
 * 예: "청아(여왕)" → "청아", "손밍(퇴근)" → "손밍"
 */
function normalizeBjName(bjName: string): string {
  return bjName
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s*\((여왕|왕|공주|퇴근|조퇴|방장|매니저|열혈팬|우수팬|신규팬|대표BJ)\)\s*/g, '')
    .trim()
}

function parseCSV(filePath: string): DonationRow[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  // BOM 제거
  const cleanContent = content.replace(/^\uFEFF/, '')
  const lines = cleanContent.split('\n').filter(line => line.trim())

  // 헤더 스킵
  const dataLines = lines.slice(1)

  return dataLines.map(line => {
    // CSV 파싱 (쉼표로 분리, 단 따옴표 안의 쉼표는 무시)
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

async function importDonations(
  filePaths: string[],
  seasonId: number,
  episodeId: number,
  episodeNumber: number
) {
  console.log(`\n📥 EP${episodeNumber} Import 시작...`)
  
  // 모든 파일에서 데이터 수집
  let allRows: DonationRow[] = []
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  파일 없음: ${path.basename(filePath)}`)
      continue
    }
    const rows = parseCSV(filePath)
    console.log(`   📄 ${path.basename(filePath)}: ${rows.length}건`)
    allRows = allRows.concat(rows)
  }
  
  console.log(`   총 파싱된 데이터: ${allRows.length}건`)

  if (allRows.length === 0) {
    console.log(`   ⚠️  임포트할 데이터 없음`)
    return 0
  }

  // 기존 데이터 확인
  const { count: existingCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('episode_id', episodeId)

  if (existingCount && existingCount > 0) {
    console.log(`   ⚠️  기존 데이터 ${existingCount}건 존재 - 삭제 후 재입력`)
    await supabase.from('donations').delete().eq('episode_id', episodeId)
  }

  // 데이터 변환
  const donationsToInsert = allRows.map(row => ({
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
  
  for (let i = 0; i < donationsToInsert.length; i += batchSize) {
    const batch = donationsToInsert.slice(i, i + batchSize)
    const { error } = await supabase.from('donations').insert(batch)
    
    if (error) {
      console.error(`   ❌ 배치 ${i / batchSize + 1} 삽입 실패:`, error.message)
    } else {
      insertedCount += batch.length
    }
  }

  console.log(`   ✅ EP${episodeNumber}: ${insertedCount}건 임포트 완료`)

  // 에피소드 확정 처리 (is_finalized + 집계 업데이트)
  if (insertedCount > 0) {
    const totalHearts = allRows.reduce((sum, r) => sum + r.amount, 0)
    const uniqueDonors = new Set(allRows.map(r => r.donor_name)).size
    const sourceFiles = filePaths.map(f => path.basename(f)).join(', ')

    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        is_finalized: true,
        finalized_at: new Date().toISOString(),
        total_hearts: totalHearts,
        donor_count: uniqueDonors,
        source_file: sourceFiles,
      })
      .eq('id', episodeId)

    if (updateError) {
      console.error(`   ⚠️  에피소드 확정 실패:`, updateError.message)
    } else {
      console.log(`   📌 에피소드 확정: is_finalized=true, 총 ${totalHearts.toLocaleString()} 하트, ${uniqueDonors}명`)
    }
  }

  return insertedCount
}

async function main() {
  const downloadsDir = process.env.HOME + '/Downloads'
  
  console.log('========================================')
  console.log('📥 PandaTV 후원 데이터 Import')
  console.log('========================================')

  // 에피소드별 파일 매핑
  const episodeFiles = [
    {
      episodeId: 15,
      episodeNumber: 4,
      files: [
        `${downloadsDir}/RG패밀리 엑셀부 시즌_내역_2026020205 (3).csv`,
        `${downloadsDir}/RG패밀리 엑셀부 시즌_내역_2026020205 (4).csv`,
        `${downloadsDir}/RG패밀리 엑셀부 시즌_내역_2026020205 (5).csv`,
      ]
    },
    {
      episodeId: 16,
      episodeNumber: 5,
      files: [
        `${downloadsDir}/RG패밀리 엑셀부 시즌_내역_2026020205 (6).csv`,
      ]
    },
    {
      episodeId: 17,
      episodeNumber: 6,
      files: [
        `${downloadsDir}/RG패밀리 엑셀부 시즌_내역_2026020205 (7).csv`,
      ]
    },
  ]

  const seasonId = 1
  let totalImported = 0

  for (const ep of episodeFiles) {
    const count = await importDonations(ep.files, seasonId, ep.episodeId, ep.episodeNumber)
    totalImported += count
  }

  console.log('\n========================================')
  console.log(`✅ 총 ${totalImported}건 임포트 완료`)
  console.log('========================================')
}

main().catch(console.error)
