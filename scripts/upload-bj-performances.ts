/**
 * BJ 에피소드 성적 업로드 스크립트
 *
 * CSV 파일에서 BJ별 성적 데이터를 읽어서 Supabase에 업로드합니다.
 *
 * 사용법:
 *   npx ts-node scripts/upload-bj-performances.ts --episode=2 --file="./data/episode2.csv"
 *
 * CSV 형식:
 *   순위,닉네임,받은하트,후원건수,하트점수,기여도,직급전순위및결과
 *   1,가윤,100000,50,100000,100000,1위 상금 300만원
 *
 * 특수 처리:
 *   - RG_family(대표BJ): episodes.representative_bj_total에 저장
 *   - 손밍: organization에 추가되어 있어야 함
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// .env.local 로드
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  console.error('   NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 확인 필요')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

// CSV 행 타입
interface CsvRow {
  rank: number
  name: string
  hearts: number
  count: number
  score: number
  contribution: number
  result: string
}

// Organization 멤버 타입
interface OrgMember {
  id: number
  name: string
}

// 대표 BJ 식별 키워드
const REPRESENTATIVE_BJ_KEYWORDS = ['RG_family', 'RG_Family', '대표BJ', '대표', 'RGfamily']

/**
 * 커맨드라인 인자 파싱
 */
function parseArgs(): { episodeId: number; filePath: string; dryRun: boolean } {
  const args = process.argv.slice(2)
  let episodeId = 0
  let filePath = ''
  let dryRun = false

  for (const arg of args) {
    if (arg.startsWith('--episode=')) {
      episodeId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--file=')) {
      filePath = arg.split('=')[1].replace(/^["']|["']$/g, '')
    } else if (arg === '--dry-run') {
      dryRun = true
    }
  }

  if (!episodeId || !filePath) {
    console.error('사용법: npx ts-node scripts/upload-bj-performances.ts --episode=<ID> --file=<CSV파일>')
    console.error('예: npx ts-node scripts/upload-bj-performances.ts --episode=2 --file="./data/episode2.csv"')
    console.error('')
    console.error('옵션:')
    console.error('  --episode=<ID>  : 에피소드 ID (필수)')
    console.error('  --file=<PATH>   : CSV 파일 경로 (필수)')
    console.error('  --dry-run       : 실제 저장 없이 미리보기만')
    process.exit(1)
  }

  return { episodeId, filePath, dryRun }
}

/**
 * CSV 파일 파싱
 */
function parseCsv(filePath: string): CsvRow[] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${absolutePath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(absolutePath, 'utf-8')
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    console.error('❌ CSV 파일에 데이터가 없습니다.')
    process.exit(1)
  }

  // 첫 번째 줄은 헤더
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((col) => col.trim())
    if (cols.length < 6) continue

    rows.push({
      rank: parseInt(cols[0], 10) || i,
      name: cols[1],
      hearts: parseNumber(cols[2]),
      count: parseNumber(cols[3]),
      score: parseNumber(cols[4]),
      contribution: parseNumber(cols[5]),
      result: cols[6] || '',
    })
  }

  return rows
}

/**
 * 숫자 파싱 (콤마 제거)
 */
function parseNumber(value: string): number {
  return parseInt(value.replace(/,/g, ''), 10) || 0
}

/**
 * 대표 BJ 이름인지 확인
 */
function isRepresentativeBj(name: string): boolean {
  return REPRESENTATIVE_BJ_KEYWORDS.some((keyword) => name.includes(keyword))
}

/**
 * Organization 멤버 조회
 */
async function getOrganizationMembers(): Promise<Map<string, OrgMember>> {
  const { data, error } = await supabase.from('organization').select('id, name').eq('is_active', true)

  if (error) {
    console.error('❌ organization 조회 실패:', error.message)
    process.exit(1)
  }

  const memberMap = new Map<string, OrgMember>()
  data?.forEach((member) => {
    memberMap.set(member.name, { id: member.id, name: member.name })
  })

  return memberMap
}

/**
 * 에피소드 존재 확인
 */
async function verifyEpisode(episodeId: number): Promise<void> {
  const { data, error } = await supabase.from('episodes').select('id, title, episode_number').eq('id', episodeId).single()

  if (error || !data) {
    console.error(`❌ 에피소드 ID ${episodeId}을(를) 찾을 수 없습니다.`)
    process.exit(1)
  }

  console.log(`📌 대상 에피소드: ${data.title} (ID: ${data.id})`)
}

/**
 * 대표 BJ 성적을 episodes 테이블에 저장
 */
async function saveRepresentativeBjTotal(episodeId: number, row: CsvRow, dryRun: boolean): Promise<void> {
  const representativeBjTotal = {
    hearts: row.hearts,
    count: row.count,
    score: row.score,
    contribution: row.contribution,
    result: row.result || undefined,
  }

  if (dryRun) {
    console.log(`   📝 [DRY-RUN] 대표BJ 성적: ${JSON.stringify(representativeBjTotal)}`)
    return
  }

  const { error } = await supabase.from('episodes').update({ representative_bj_total: representativeBjTotal }).eq('id', episodeId)

  if (error) {
    console.error(`   ❌ 대표BJ 성적 저장 실패:`, error.message)
  } else {
    console.log(`   ✅ 대표BJ 성적 저장 완료`)
  }
}

/**
 * BJ 성적을 bj_episode_performances 테이블에 저장
 */
async function saveBjPerformance(episodeId: number, bjMemberId: number, row: CsvRow, dryRun: boolean): Promise<boolean> {
  const performance = {
    episode_id: episodeId,
    bj_member_id: bjMemberId,
    donation_hearts: row.hearts,
    donation_count: row.count,
    heart_score: row.score,
    contribution: row.contribution,
    final_rank: row.rank,
    rank_result: row.result || null,
  }

  if (dryRun) {
    console.log(`   📝 [DRY-RUN] ${row.name}: ${JSON.stringify(performance)}`)
    return true
  }

  // UPSERT: 기존 데이터가 있으면 업데이트
  const { error } = await supabase
    .from('bj_episode_performances')
    .upsert(performance, { onConflict: 'episode_id,bj_member_id' })

  if (error) {
    console.error(`   ❌ ${row.name} 저장 실패:`, error.message)
    return false
  }

  return true
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 BJ 에피소드 성적 업로드 시작\n')

  const { episodeId, filePath, dryRun } = parseArgs()

  if (dryRun) {
    console.log('⚠️  DRY-RUN 모드: 실제 저장 없이 미리보기만 실행합니다.\n')
  }

  // 1. 에피소드 확인
  await verifyEpisode(episodeId)

  // 2. Organization 멤버 조회
  console.log('\n📋 Organization 멤버 조회 중...')
  const orgMembers = await getOrganizationMembers()
  console.log(`   ${orgMembers.size}명의 BJ 멤버 로드됨`)

  // 3. CSV 파싱
  console.log(`\n📄 CSV 파일 파싱: ${filePath}`)
  const rows = parseCsv(filePath)
  console.log(`   ${rows.length}개 데이터 행 발견`)

  // 4. 데이터 처리
  console.log('\n🔄 데이터 처리 시작...')
  console.log('─'.repeat(60))

  let successCount = 0
  let failCount = 0
  let representativeBjFound = false

  for (const row of rows) {
    // 대표 BJ 처리
    if (isRepresentativeBj(row.name)) {
      console.log(`\n🏆 대표BJ(${row.name}) 처리:`)
      await saveRepresentativeBjTotal(episodeId, row, dryRun)
      representativeBjFound = true
      successCount++
      continue
    }

    // 일반 BJ 처리
    const member = orgMembers.get(row.name)
    if (!member) {
      console.log(`   ⚠️  ${row.name}: organization에서 찾을 수 없음 (건너뜀)`)
      failCount++
      continue
    }

    const saved = await saveBjPerformance(episodeId, member.id, row, dryRun)
    if (saved) {
      console.log(`   ✅ ${row.name} (ID:${member.id}): 순위 ${row.rank}, 하트 ${row.hearts.toLocaleString()}`)
      successCount++
    } else {
      failCount++
    }
  }

  // 5. 결과 요약
  console.log('─'.repeat(60))
  console.log('\n📊 처리 결과:')
  console.log(`   ✅ 성공: ${successCount}건`)
  console.log(`   ❌ 실패: ${failCount}건`)
  if (!representativeBjFound) {
    console.log(`   ⚠️  대표BJ(RG_family) 데이터를 찾지 못했습니다.`)
  }

  if (dryRun) {
    console.log('\n💡 실제 저장하려면 --dry-run 옵션 없이 다시 실행하세요.')
  } else {
    console.log('\n✅ 완료!')
  }
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err)
  process.exit(1)
})
