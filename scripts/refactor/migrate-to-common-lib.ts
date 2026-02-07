#!/usr/bin/env npx tsx
/**
 * 스크립트 공통 라이브러리 마이그레이션 도구
 *
 * 기능:
 * 1. 직접 Supabase 초기화 패턴 감지
 * 2. 공통 라이브러리로 변환
 * 3. 변환 결과 리포트
 *
 * 사용법:
 *   npx tsx scripts/refactor/migrate-to-common-lib.ts --dry-run    # 미리보기
 *   npx tsx scripts/refactor/migrate-to-common-lib.ts              # 실제 변환
 */

import * as fs from 'fs'
import * as path from 'path'

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts')
const DRY_RUN = process.argv.includes('--dry-run')

interface MigrationResult {
  file: string
  status: 'converted' | 'skipped' | 'already-using-lib' | 'error'
  reason?: string
  changes?: string[]
}

// 이미 공통 라이브러리를 사용하는 스크립트 (변환 불필요)
const ALREADY_USING_LIB = [
  'refresh-season-rankings.ts',
  'refresh-total-rankings.ts',
  'update-season-rankings.ts',
  'update-total-rankings.ts',
  'verify-ranking-integrity.ts',
  'migrate-legacy-data.ts',
]

// 변환 제외 대상
const EXCLUDE_PATTERNS = [
  /^lib\//,          // lib 폴더
  /^archive\//,      // archive 폴더
  /^refactor\//,     // refactor 폴더
  /^docs\//,         // docs 폴더
  /\.test\.ts$/,     // 테스트 파일
  /\.spec\.ts$/,
]

// 직접 Supabase 초기화 패턴들
const PATTERNS = {
  // 패턴 1: dotenv + createClient
  dotenvImport: /import \* as dotenv from ['"]dotenv['"]/,
  dotenvConfig: /dotenv\.config\([^)]*\)/,
  createClientImport: /import \{ createClient \} from ['"]@supabase\/supabase-js['"]/,
  directEnvAccess: /process\.env\.(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)/g,

  // 패턴 2: 수동 환경변수 파싱
  manualEnvParsing: /fs\.readFileSync\([^)]*\.env\.local[^)]*\)/,
  envSplit: /\.split\(['"]\\n['"]\)\.forEach/,

  // 패턴 3: createClient 직접 호출
  createClientCall: /createClient\s*\(\s*(process\.env|envVars)\./,
}

function shouldExclude(relativePath: string): boolean {
  return EXCLUDE_PATTERNS.some(p => p.test(relativePath))
}

function analyzeFile(filePath: string): {
  needsMigration: boolean
  patterns: string[]
} {
  const content = fs.readFileSync(filePath, 'utf-8')
  const patterns: string[] = []

  if (PATTERNS.dotenvImport.test(content)) patterns.push('dotenv import')
  if (PATTERNS.dotenvConfig.test(content)) patterns.push('dotenv.config()')
  if (PATTERNS.createClientImport.test(content)) patterns.push('createClient import')
  if (PATTERNS.directEnvAccess.test(content)) patterns.push('직접 env 접근')
  if (PATTERNS.manualEnvParsing.test(content)) patterns.push('수동 env 파싱')
  if (PATTERNS.createClientCall.test(content)) patterns.push('createClient 직접 호출')

  // 이미 공통 라이브러리 사용 중인지 확인
  if (content.includes("from './lib/supabase'") ||
      content.includes("from '../lib/supabase'") ||
      content.includes('from "./lib/supabase"')) {
    return { needsMigration: false, patterns: [] }
  }

  return {
    needsMigration: patterns.length > 0,
    patterns,
  }
}

function convertFile(filePath: string): MigrationResult {
  const relativePath = path.relative(SCRIPTS_DIR, filePath)
  const fileName = path.basename(filePath)

  // 제외 대상 체크
  if (shouldExclude(relativePath)) {
    return { file: relativePath, status: 'skipped', reason: '제외 대상' }
  }

  // 이미 공통 라이브러리 사용 중
  if (ALREADY_USING_LIB.includes(fileName)) {
    return { file: relativePath, status: 'already-using-lib' }
  }

  const analysis = analyzeFile(filePath)

  if (!analysis.needsMigration) {
    return { file: relativePath, status: 'already-using-lib' }
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  const changes: string[] = []

  // 1. dotenv import 제거
  if (PATTERNS.dotenvImport.test(content)) {
    content = content.replace(/import \* as dotenv from ['"]dotenv['"]\n?/g, '')
    changes.push('dotenv import 제거')
  }

  // 2. dotenv.config 제거
  if (PATTERNS.dotenvConfig.test(content)) {
    content = content.replace(/dotenv\.config\([^)]*\)\n?/g, '')
    changes.push('dotenv.config() 제거')
  }

  // 3. 수동 환경변수 파싱 블록 제거 (복잡한 패턴)
  const manualEnvBlock = /const envPath.*?const envVars.*?[\s\S]*?\.forEach\([^)]+\)\n?/g
  if (manualEnvBlock.test(content)) {
    content = content.replace(manualEnvBlock, '')
    changes.push('수동 env 파싱 블록 제거')
  }

  // 4. createClient import를 getServiceClient import로 교체
  if (PATTERNS.createClientImport.test(content)) {
    // 기존 import 제거
    content = content.replace(
      /import \{ createClient(?:, [^}]+)? \} from ['"]@supabase\/supabase-js['"]\n?/g,
      ''
    )

    // 새 import 추가 (파일 맨 위에)
    const libPath = relativePath.includes('/') ? '../lib/supabase' : './lib/supabase'
    const newImport = `import { getServiceClient } from '${libPath}'\n`

    // 첫 번째 import 문 앞에 추가
    const firstImportMatch = content.match(/^import /m)
    if (firstImportMatch) {
      const insertPos = content.indexOf(firstImportMatch[0])
      content = content.slice(0, insertPos) + newImport + content.slice(insertPos)
    } else {
      content = newImport + content
    }

    changes.push('createClient → getServiceClient import 변환')
  }

  // 5. createClient 호출을 getServiceClient()로 교체
  // 패턴: const supabase = createClient(...)
  const createClientPattern = /const\s+(\w+)\s*=\s*createClient\s*\([^)]+\)/g
  if (createClientPattern.test(content)) {
    content = content.replace(
      /const\s+(\w+)\s*=\s*createClient\s*\([^)]+\)/g,
      'const $1 = getServiceClient()'
    )
    changes.push('createClient() → getServiceClient() 변환')
  }

  // 6. 불필요한 빈 줄 정리
  content = content.replace(/\n{3,}/g, '\n\n')

  if (changes.length === 0) {
    return { file: relativePath, status: 'skipped', reason: '변환 패턴 매칭 실패' }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, content)
  }

  return { file: relativePath, status: 'converted', changes }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 스크립트 공통 라이브러리 마이그레이션')
  console.log(`   모드: ${DRY_RUN ? '🔍 미리보기 (dry-run)' : '✏️  실제 변환'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 스크립트 파일 수집
  const files = fs.readdirSync(SCRIPTS_DIR)
    .filter(f => f.endsWith('.ts') && !shouldExclude(f))
    .map(f => path.join(SCRIPTS_DIR, f))

  console.log(`📁 분석 대상: ${files.length}개 스크립트\n`)

  const results: MigrationResult[] = []

  for (const file of files) {
    const result = convertFile(file)
    results.push(result)
  }

  // 결과 출력
  const converted = results.filter(r => r.status === 'converted')
  const skipped = results.filter(r => r.status === 'skipped')
  const alreadyUsing = results.filter(r => r.status === 'already-using-lib')

  console.log('📊 변환 결과\n')

  if (converted.length > 0) {
    console.log(`✅ 변환됨: ${converted.length}개`)
    converted.forEach(r => {
      console.log(`   ${r.file}`)
      r.changes?.forEach(c => console.log(`      - ${c}`))
    })
    console.log()
  }

  if (alreadyUsing.length > 0) {
    console.log(`✓ 이미 공통 라이브러리 사용: ${alreadyUsing.length}개`)
  }

  if (skipped.length > 0) {
    console.log(`⊘ 건너뜀: ${skipped.length}개`)
    if (process.argv.includes('--verbose')) {
      skipped.forEach(r => console.log(`   ${r.file}: ${r.reason}`))
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 요약')
  console.log(`   총 파일: ${results.length}개`)
  console.log(`   변환됨: ${converted.length}개`)
  console.log(`   이미 OK: ${alreadyUsing.length}개`)
  console.log(`   건너뜀: ${skipped.length}개`)

  if (DRY_RUN && converted.length > 0) {
    console.log('\n💡 실제 변환하려면: npx tsx scripts/refactor/migrate-to-common-lib.ts')
  }
}

main().catch(console.error)
