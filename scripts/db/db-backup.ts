/**
 * DB 백업 스크립트 - 주요 테이블 데이터를 JSON으로 export
 *
 * 사용법:
 *   npx tsx scripts/db/db-backup.ts           # 전체 백업
 *   npx tsx scripts/db/db-backup.ts --dry-run  # 대상 테이블 목록만 출력
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const BACKUP_TABLES = [
  'total_donation_rankings',
  'season_donation_rankings',
  'rank_battle_records',
  'signature_eligibility',
  'vip_rewards',
  'organization',
  'signatures',
  'signature_videos',
  'seasons',
  'episodes',
] as const

// profiles는 민감 컬럼 제외
const PROFILES_SELECT = 'id, nickname, role, unit, avatar_url, created_at'

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')

  console.log('📦 RG Family DB 백업')
  console.log('─'.repeat(50))

  if (isDryRun) {
    console.log('🔍 [DRY RUN] 백업 대상 테이블:')
    for (const table of BACKUP_TABLES) {
      console.log(`   - ${table}`)
    }
    console.log(`   - profiles (선택 컬럼: ${PROFILES_SELECT})`)
    console.log('\n💡 실제 백업: npx tsx scripts/db/db-backup.ts')
    return
  }

  const supabase = getServiceClient()

  // 백업 디렉토리 생성
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupDir = path.resolve(process.cwd(), 'backups', timestamp)
  fs.mkdirSync(backupDir, { recursive: true })

  console.log(`📁 백업 디렉토리: ${backupDir}\n`)

  let successCount = 0
  let errorCount = 0

  // 일반 테이블 백업
  for (const table of BACKUP_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('id', { ascending: true })
        .limit(10000)

      if (error) {
        console.error(`❌ ${table}: ${error.message}`)
        errorCount++
        continue
      }

      const filePath = path.join(backupDir, `${table}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`✅ ${table}: ${data?.length || 0}건 → ${table}.json`)
      successCount++
    } catch (err) {
      console.error(`❌ ${table}: ${err instanceof Error ? err.message : err}`)
      errorCount++
    }
  }

  // profiles 테이블 (민감 컬럼 제외)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILES_SELECT)
      .order('created_at', { ascending: true })
      .limit(10000)

    if (error) {
      console.error(`❌ profiles: ${error.message}`)
      errorCount++
    } else {
      const filePath = path.join(backupDir, 'profiles.json')
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`✅ profiles: ${data?.length || 0}건 → profiles.json (민감 컬럼 제외)`)
      successCount++
    }
  } catch (err) {
    console.error(`❌ profiles: ${err instanceof Error ? err.message : err}`)
    errorCount++
  }

  // 메타데이터 저장
  const meta = {
    created_at: now.toISOString(),
    tables: [...BACKUP_TABLES, 'profiles'],
    success: successCount,
    errors: errorCount,
  }
  fs.writeFileSync(path.join(backupDir, '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8')

  console.log('\n' + '─'.repeat(50))
  console.log(`📊 완료: ${successCount}개 성공, ${errorCount}개 실패`)
  console.log(`📁 위치: ${backupDir}`)
}

main().catch((err) => {
  console.error('❌ 백업 실패:', err)
  process.exit(1)
})
