/**
 * 스키마 스냅샷 스크립트 - 현재 DB 스키마를 마크다운으로 출력
 *
 * 사용법:
 *   npx tsx scripts/db/dump-schema.ts          # 콘솔 출력
 *   npx tsx scripts/db/dump-schema.ts --save   # backups/schema-YYYYMMDD.md 저장
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const args = process.argv.slice(2)
  const shouldSave = args.includes('--save')

  const supabase = getServiceClient()
  const lines: string[] = []

  const now = new Date()
  lines.push(`# RG Family DB 스키마 스냅샷`)
  lines.push(``)
  lines.push(`> 생성일: ${now.toISOString().slice(0, 10)}`)
  lines.push(``)

  // 1. 테이블 목록
  lines.push(`## 테이블`)
  lines.push(``)

  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables' as any)
    .select('table_name, table_type')
    .eq('table_schema', 'public')
    .order('table_name')

  if (tablesError) {
    // information_schema 접근이 안 될 수 있으므로 대체 방법 사용
    console.log('ℹ️  information_schema 직접 접근 불가, 알려진 테이블 목록 사용')

    const knownTables = [
      'profiles', 'seasons', 'episodes', 'donations',
      'organization', 'vip_rewards', 'vip_images',
      'schedules', 'timeline_events', 'live_status',
      'banners', 'notices', 'posts', 'comments',
      'signatures', 'signature_videos', 'media_content',
      'tribute_guestbook', 'bj_thank_you_messages',
      'vip_personal_messages', 'rank_battle_records',
      'total_donation_rankings', 'season_donation_rankings',
      'signature_eligibility',
    ]

    lines.push(`| 테이블 | 행 수 |`)
    lines.push(`|--------|-------|`)

    for (const table of knownTables) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        lines.push(`| ${table} | ${count ?? '?'} |`)
      } catch {
        lines.push(`| ${table} | - |`)
      }
    }
  } else {
    lines.push(`| 테이블 | 유형 |`)
    lines.push(`|--------|------|`)
    for (const t of (tables || [])) {
      lines.push(`| ${t.table_name} | ${t.table_type} |`)
    }
  }

  lines.push(``)

  // 2. 알려진 View 목록
  lines.push(`## Views`)
  lines.push(``)
  const knownViews = [
    'total_rankings_public',
    'season_rankings_public',
    'vip_clickable_profiles',
  ]

  for (const view of knownViews) {
    try {
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(1)

      if (!error && data && data.length > 0) {
        const columns = Object.keys(data[0])
        lines.push(`### ${view}`)
        lines.push(`컬럼: ${columns.join(', ')}`)
        lines.push(``)
      } else if (!error) {
        lines.push(`### ${view}`)
        lines.push(`(빈 View)`)
        lines.push(``)
      }
    } catch {
      // View가 없을 수 있음
    }
  }

  const output = lines.join('\n')

  if (shouldSave) {
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const backupDir = path.resolve(process.cwd(), 'backups')
    fs.mkdirSync(backupDir, { recursive: true })
    const filePath = path.join(backupDir, `schema-${dateStr}.md`)
    fs.writeFileSync(filePath, output, 'utf-8')
    console.log(`✅ 스키마 스냅샷 저장: ${filePath}`)
  } else {
    console.log(output)
  }
}

main().catch((err) => {
  console.error('❌ 스키마 스냅샷 실패:', err)
  process.exit(1)
})
