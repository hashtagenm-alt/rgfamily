/**
 * DB 복원 스크립트 - 백업 JSON을 새 Supabase 프로젝트에 복원
 *
 * ⚠️ 주의: 고객사 새 DB에만 사용! 기존 운영 DB에 실행하지 마세요.
 *
 * 사용법:
 *   npx tsx scripts/db/db-restore.ts --backup backups/2026-03-25T08-08-59
 *   npx tsx scripts/db/db-restore.ts --backup backups/2026-03-25T08-08-59 --dry-run
 *   npx tsx scripts/db/db-restore.ts --backup backups/2026-03-25T08-08-59 --table seasons
 *
 * 환경변수:
 *   .env.local의 SUPABASE 키를 새 고객사 프로젝트로 변경 후 실행
 *   또는 환경변수를 직접 지정:
 *   NEXT_PUBLIC_SUPABASE_URL=https://NEW.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/db/db-restore.ts --backup backups/2026-03-25T08-08-59
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ============================================================
// 복원 순서 (FK 의존성 순서)
// ============================================================
const RESTORE_ORDER = [
  // 1단계: 의존성 없는 테이블
  'seasons',
  'profiles',

  // 2단계: profiles/seasons에 의존
  'organization',
  'episodes',

  // 3단계: organization/episodes에 의존
  'signatures',
  'vip_rewards',
  'rank_battle_records',
  'total_donation_rankings',
  'season_donation_rankings',
  'signature_eligibility',

  // 4단계: signatures/organization에 의존
  'signature_videos',
] as const

// profiles 복원 시 매핑할 컬럼 (백업에 없는 컬럼은 기본값)
const PROFILES_DEFAULTS = {
  email: null,
  total_donation: 0,
  pandatv_id: null,
  account_type: 'real',
  updated_at: new Date().toISOString(),
}

// ============================================================
// 메인
// ============================================================
async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const backupIdx = args.indexOf('--backup')
  const tableIdx = args.indexOf('--table')

  if (backupIdx === -1 || !args[backupIdx + 1]) {
    console.error('❌ --backup <경로> 옵션이 필요합니다.')
    console.error('   예: npx tsx scripts/db/db-restore.ts --backup backups/2026-03-25T08-08-59')
    process.exit(1)
  }

  const backupDir = path.resolve(process.cwd(), args[backupIdx + 1])
  const targetTable = tableIdx !== -1 ? args[tableIdx + 1] : null

  // 백업 디렉토리 확인
  if (!fs.existsSync(backupDir)) {
    console.error(`❌ 백업 디렉토리가 없습니다: ${backupDir}`)
    process.exit(1)
  }

  // 메타 확인
  const metaPath = path.join(backupDir, '_meta.json')
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    console.log(`📦 백업 정보: ${meta.created_at} (${meta.success}개 테이블)`)
  }

  console.log('─'.repeat(50))

  // 환경변수 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.')
    process.exit(1)
  }

  // ⚠️ 안전 확인: 기존 운영 DB에 실행 방지
  const PROD_PROJECT = 'cdiptfmagemjfmsuphaj'
  if (supabaseUrl.includes(PROD_PROJECT)) {
    console.error('🚫 기존 운영 DB에는 실행할 수 없습니다!')
    console.error('   .env.local을 고객사 새 프로젝트 키로 변경한 후 다시 실행하세요.')
    process.exit(1)
  }

  console.log(`🎯 대상 DB: ${supabaseUrl}`)

  if (isDryRun) {
    console.log('🔍 [DRY RUN] 실제 복원하지 않습니다.\n')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 복원할 테이블 결정
  const tables = targetTable
    ? [targetTable]
    : RESTORE_ORDER.filter(t => fs.existsSync(path.join(backupDir, `${t}.json`)))

  let successCount = 0
  let errorCount = 0

  for (const table of tables) {
    const filePath = path.join(backupDir, `${table}.json`)

    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  ${table}: 백업 파일 없음, 건너뜀`)
      continue
    }

    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const rows = Array.isArray(rawData) ? rawData : []

    if (rows.length === 0) {
      console.log(`⏭️  ${table}: 0건, 건너뜀`)
      continue
    }

    if (isDryRun) {
      console.log(`📋 ${table}: ${rows.length}건 복원 예정`)
      successCount++
      continue
    }

    try {
      // 테이블별 특수 처리
      const processedRows = processRows(table, rows)

      // 배치 upsert (500건씩)
      const batchSize = 500
      let inserted = 0

      for (let i = 0; i < processedRows.length; i += batchSize) {
        const batch = processedRows.slice(i, i + batchSize)
        const { error } = await (supabase.from(table as any) as any).upsert(batch, {
          onConflict: getConflictColumn(table),
          ignoreDuplicates: false,
        })

        if (error) {
          throw new Error(`batch ${i}-${i + batch.length}: ${error.message}`)
        }
        inserted += batch.length
      }

      console.log(`✅ ${table}: ${inserted}건 복원 완료`)
      successCount++
    } catch (err: any) {
      console.error(`❌ ${table}: ${err.message}`)
      errorCount++
    }
  }

  console.log('─'.repeat(50))
  console.log(`📊 완료: ${successCount}개 성공, ${errorCount}개 실패`)

  if (!isDryRun && errorCount === 0) {
    console.log('\n🔧 후속 작업:')
    console.log('   1. Supabase Dashboard에서 시퀀스 리셋 필요:')
    console.log('      SELECT setval(pg_get_serial_sequence(\'테이블명\', \'id\'), (SELECT MAX(id) FROM 테이블명));')
    console.log('   2. donations 테이블은 별도 복원 (대량 데이터)')
    console.log('   3. 나머지 테이블 (notices, posts, schedules 등)은 운영 시작 후 생성')
  }
}

// ============================================================
// 테이블별 데이터 가공
// ============================================================
function processRows(table: string, rows: any[]): any[] {
  switch (table) {
    case 'profiles':
      // 백업에 없는 컬럼 기본값 추가
      return rows.map(row => ({
        ...PROFILES_DEFAULTS,
        ...row,
      }))

    case 'organization':
      // parent_id 순환 참조 방지: parent_id가 있는 행은 나중에 삽입
      // → 먼저 parent_id=null인 행, 그다음 parent_id 있는 행
      const roots = rows.filter(r => r.parent_id === null)
      const children = rows.filter(r => r.parent_id !== null)
      return [...roots, ...children]

    case 'signature_videos':
      // is_published 기본값
      return rows.map(row => ({
        ...row,
        is_published: row.is_published ?? true,
      }))

    default:
      return rows
  }
}

// ============================================================
// 테이블별 upsert conflict 컬럼
// ============================================================
function getConflictColumn(table: string): string {
  switch (table) {
    case 'profiles':
      return 'id'
    case 'seasons':
      return 'id'
    case 'organization':
      return 'id'
    case 'episodes':
      return 'id'
    case 'signatures':
      return 'id'
    case 'signature_videos':
      return 'id'
    case 'vip_rewards':
      return 'id'
    case 'rank_battle_records':
      return 'id'
    case 'total_donation_rankings':
      return 'id'
    case 'season_donation_rankings':
      return 'id'
    case 'signature_eligibility':
      return 'id'
    default:
      return 'id'
  }
}

main().catch(err => {
  console.error('치명적 오류:', err)
  process.exit(1)
})
