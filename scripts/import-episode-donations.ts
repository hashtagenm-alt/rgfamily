/**
 * 에피소드별 후원 데이터 Import 스크립트
 *
 * 사용법: npx tsx scripts/import-episode-donations.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface CsvRow {
  donated_at: string
  donor_name: string
  amount: number
  target_bj: string
}

/**
 * 아이디(닉네임) 형식에서 닉네임만 추출
 * 예: "yuricap85(한세아내꺼♡호랭이)" → "한세아내꺼♡호랭이"
 */
function extractNickname(idWithNickname: string): string {
  const match = idWithNickname.match(/\(([^)]+)\)/)
  return match ? match[1] : idWithNickname
}

function parseCSV(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  // 헤더 스킵
  const dataLines = lines.slice(1)

  return dataLines.map(line => {
    // CSV 파싱 (쉼표로 분리)
    const parts = line.split(',')

    // 닉네임 추출 (아이디(닉네임) 형식에서 닉네임만)
    const rawDonorName = parts[1]?.trim() || ''
    const nickname = extractNickname(rawDonorName)

    return {
      donated_at: parts[0]?.trim() || '',
      donor_name: nickname,
      amount: parseInt(parts[2]?.trim() || '0', 10),
      target_bj: parts[3]?.trim().replace('(퇴근)', '').replace('(조퇴)', '').trim() || '',
    }
  }).filter(row => row.donor_name && row.amount > 0)
}

async function importDonations(
  filePath: string,
  seasonId: number,
  episodeId: number,
  episodeNumber: number
) {
  console.log(`\n📥 ${episodeNumber}화 Import 시작...`)
  console.log(`   파일: ${path.basename(filePath)}`)

  // CSV 파싱
  const rows = parseCSV(filePath)
  console.log(`   파싱된 데이터: ${rows.length}건`)

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
      console.error(`   ❌ 삭제 실패:`, deleteError.message)
      return false
    }
  }

  // 배치 Insert (100건씩)
  const batchSize = 100
  let inserted = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map(row => ({
      donor_name: row.donor_name,
      amount: row.amount,
      season_id: seasonId,
      episode_id: episodeId,
      unit: 'excel' as const,
      target_bj: row.target_bj || null,
      donated_at: row.donated_at || null,
    }))

    const { error } = await supabase
      .from('donations')
      .insert(batch)

    if (error) {
      console.error(`   ❌ 배치 ${i / batchSize + 1} 실패:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
    }
  }

  console.log(`   ✅ Import 완료: ${inserted}건 성공, ${errors}건 실패`)
  return true
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 에피소드 후원 데이터 Import')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const imports = [
    {
      filePath: '/Users/bagjaeseog/Downloads/RG패밀리 엑셀부 시즌_내역_2026013002.csv',
      seasonId: 1,
      episodeId: 16,
      episodeNumber: 5,
    },
  ]

  for (const config of imports) {
    if (!fs.existsSync(config.filePath)) {
      console.error(`❌ 파일 없음: ${config.filePath}`)
      continue
    }

    await importDonations(
      config.filePath,
      config.seasonId,
      config.episodeId,
      config.episodeNumber
    )
  }

  // 최종 확인
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Import 결과 확인')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number')
    .eq('season_id', 1)
    .in('episode_number', [3, 4])

  for (const ep of episodes || []) {
    const { count } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('episode_id', ep.id)

    console.log(`${ep.episode_number}화 (id:${ep.id}): ${count}건`)
  }

  console.log('\n✅ 완료!')
}

main().catch(console.error)
