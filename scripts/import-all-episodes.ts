/**
 * 모든 에피소드 CSV 파일 Import 스크립트
 *
 * 사용법: npx tsx scripts/import-all-episodes.ts
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

const supabase = getServiceClient()

interface CsvRow {
  donated_at: string
  donor_name: string
  amount: number
  target_bj: string
}

function extractNickname(idWithNickname: string): string {
  const match = idWithNickname.match(/\(([^)]+)\)/)
  return match ? match[1] : idWithNickname
}

function cleanBjName(bjName: string): string {
  // 직급 태그 + PandaTV 칭호/상태 접미사 제거
  return bjName
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s*\((여왕|왕|공주|퇴근|조퇴|방장|매니저|열혈팬|우수팬|신규팬|대표BJ)\)\s*/g, '')
    .trim()
}

function parseCSV(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  // BOM 제거 및 헤더 스킵
  const dataLines = lines.slice(1)

  return dataLines.map(line => {
    const parts = line.replace(/^\uFEFF/, '').split(',')

    const rawDonorName = parts[1]?.trim() || ''
    const nickname = extractNickname(rawDonorName)
    const rawBjName = parts[3]?.trim() || ''
    const bjName = cleanBjName(rawBjName)

    return {
      donated_at: parts[0]?.trim() || '',
      donor_name: nickname,
      amount: parseInt(parts[2]?.trim() || '0', 10),
      target_bj: bjName,
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

  let allRows: CsvRow[] = []

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  파일 없음: ${path.basename(filePath)}`)
      continue
    }
    const rows = parseCSV(filePath)
    console.log(`   파일: ${path.basename(filePath)} - ${rows.length}건`)
    allRows = allRows.concat(rows)
  }

  if (allRows.length === 0) {
    console.log(`   ⚠️  데이터 없음 - 스킵`)
    return false
  }

  // 기존 데이터 확인 및 삭제
  const { count: existingCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('episode_id', episodeId)

  if (existingCount && existingCount > 0) {
    console.log(`   ⚠️  기존 데이터 ${existingCount}건 삭제`)
    const { error: deleteError } = await supabase
      .from('donations')
      .delete()
      .eq('episode_id', episodeId)

    if (deleteError) {
      console.error(`   ❌ 삭제 실패:`, deleteError.message)
      return false
    }
  }

  // 배치 Insert
  const batchSize = 100
  let inserted = 0

  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize).map(row => ({
      donor_name: row.donor_name,
      amount: row.amount,
      season_id: seasonId,
      episode_id: episodeId,
      unit: 'excel' as const,
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

  // 에피소드 통계 업데이트
  const { data: totals } = await supabase
    .from('donations')
    .select('amount')
    .eq('episode_id', episodeId)

  const totalHearts = totals?.reduce((sum, d) => sum + d.amount, 0) || 0
  const donorCount = new Set(allRows.map(r => r.donor_name)).size

  await supabase
    .from('episodes')
    .update({
      total_hearts: totalHearts,
      donor_count: donorCount,
    })
    .eq('id', episodeId)

  console.log(`   ✅ 완료: ${inserted}건, 총 ${totalHearts.toLocaleString()} 하트, ${donorCount}명`)
  return true
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 전체 에피소드 후원 데이터 Import')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const basePath = '/Users/bagjaeseog/Downloads/'

  // 에피소드별 CSV 파일 매핑 (날짜 기준)
  const imports = [
    {
      // EP1: 01-20 방송, 01-21 데이터
      filePaths: [`${basePath}RG패밀리 엑셀부 시즌_내역_2026020205.csv`],
      seasonId: 1,
      episodeId: 12,
      episodeNumber: 1,
    },
    {
      // EP2: 01-22 방송, 01-23 데이터
      filePaths: [`${basePath}RG패밀리 엑셀부 시즌_내역_2026020205 (1).csv`],
      seasonId: 1,
      episodeId: 13,
      episodeNumber: 2,
    },
    {
      // EP3: 01-24 방송, 01-25 데이터
      filePaths: [`${basePath}RG패밀리 엑셀부 시즌_내역_2026020205 (2).csv`],
      seasonId: 1,
      episodeId: 14,
      episodeNumber: 3,
    },
    {
      // EP4: 01-27 방송, 01-28 데이터 (여러 파일)
      filePaths: [
        `${basePath}RG패밀리 엑셀부 시즌_내역_2026020205 (3).csv`,
        `${basePath}RG패밀리 엑셀부 시즌_내역_2026020205 (4).csv`,
        `${basePath}RG패밀리 엑셀부 시즌_내역_2026020205 (5).csv`,
      ],
      seasonId: 1,
      episodeId: 15,
      episodeNumber: 4,
    },
    {
      // EP5: 01-29 방송, 01-30 데이터
      filePaths: [`${basePath}RG패밀리 엑셀부 시즌_내역_2026020205 (6).csv`],
      seasonId: 1,
      episodeId: 16,
      episodeNumber: 5,
    },
    {
      // EP6: 01-31 방송, 02-01 데이터
      filePaths: [`${basePath}RG패밀리 엑셀부 시즌_내역_2026020205 (7).csv`],
      seasonId: 1,
      episodeId: 17,
      episodeNumber: 6,
    },
  ]

  for (const config of imports) {
    await importDonations(
      config.filePaths,
      config.seasonId,
      config.episodeId,
      config.episodeNumber
    )
  }

  // 최종 확인
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Import 결과')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number, total_hearts, donor_count')
    .eq('season_id', 1)
    .order('episode_number')

  for (const ep of episodes || []) {
    const { count } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('episode_id', ep.id)

    if (count && count > 0) {
      console.log(`EP${ep.episode_number}: ${count}건, ${(ep.total_hearts || 0).toLocaleString()} 하트, ${ep.donor_count || 0}명`)
    }
  }

  console.log('\n✅ 완료!')
}

main().catch(console.error)
