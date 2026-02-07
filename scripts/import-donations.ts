/**
 * 후원 내역 CSV 임포트 스크립트
 *
 * 방송 종료 후 생성되는 CSV 파일을 DB에 임포트합니다.
 * - 새 에피소드 자동 생성
 * - 후원 내역 삽입
 * - 중복 임포트 방지 (source_file 체크)
 *
 * 사용법:
 *   npx tsx scripts/import-donations.ts --file="CSV경로" --season=1 --episode=3 --title="조기퇴근데이"
 *
 * 예시:
 *   npx tsx scripts/import-donations.ts \
 *     --file="/Users/bagjaeseog/Downloads/후원기록/RG패밀리 엑셀부 시즌_내역_2026012517.csv" \
 *     --season=1 --episode=3 --title="3화 조기퇴근데이"
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

// .env.local 로드
 })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  console.error('   NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 확인 필요')
  process.exit(1)
}

const supabase = getServiceClient()

// CSV 파싱 결과 타입
interface DonationRecord {
  donatedAt: Date
  donorId: string
  donorName: string
  amount: number
  memberName: string
  heartScore: number
  contribution: number
}

/**
 * 커맨드라인 인자 파싱
 */
function parseArgs(): {
  filePath: string
  seasonId: number
  episodeNumber: number
  episodeId: number
  title: string
  dryRun: boolean
} {
  const args = process.argv.slice(2)
  let filePath = ''
  let seasonId = 1
  let episodeNumber = 0
  let episodeId = 0
  let title = ''
  let dryRun = false

  for (const arg of args) {
    if (arg.startsWith('--file=')) {
      filePath = arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')
    } else if (arg.startsWith('--season=')) {
      seasonId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--episode=')) {
      episodeNumber = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--episode-id=')) {
      episodeId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--title=')) {
      title = arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')
    } else if (arg === '--dry-run') {
      dryRun = true
    }
  }

  if (!filePath) {
    console.error('❌ CSV 파일 경로가 필요합니다.')
    console.error('')
    console.error('사용법:')
    console.error('  npx tsx scripts/import-donations.ts --file="CSV경로" --season=1 --episode=3 --title="제목"')
    console.error('  npx tsx scripts/import-donations.ts --file="CSV경로" --episode-id=14  # 기존 에피소드 사용')
    console.error('')
    console.error('옵션:')
    console.error('  --file=<PATH>     : CSV 파일 경로 (필수)')
    console.error('  --season=<ID>     : 시즌 ID (기본: 1)')
    console.error('  --episode=<NUM>   : 회차 번호 (기본: 자동 증가)')
    console.error('  --episode-id=<ID> : 기존 에피소드 ID (지정시 새 에피소드 생성 안함)')
    console.error('  --title=<TITLE>   : 에피소드 제목')
    console.error('  --dry-run         : 실제 저장 없이 미리보기')
    process.exit(1)
  }

  return { filePath, seasonId, episodeNumber, episodeId, title, dryRun }
}

/**
 * 닉네임 추출: "아이디(닉네임)" 형식에서 닉네임만
 */
function extractNickname(idWithNickname: string): { id: string; nickname: string } {
  const match = idWithNickname.match(/^([^(]+)\(([^)]+)\)$/)
  if (match) {
    return { id: match[1], nickname: match[2] }
  }
  return { id: idWithNickname, nickname: idWithNickname }
}

/**
 * 참여 BJ 이름 정리: 칭호/상태 접미사 제거
 * 예: "손밍 (퇴근)" → "손밍", "청아(여왕)" → "청아"
 */
function cleanMemberName(raw: string): string {
  return raw
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s*\((여왕|왕|공주|퇴근|조퇴|방장|매니저|열혈팬|우수팬|신규팬|대표BJ)\)\s*/g, '')
    .trim()
}

/**
 * CSV 파일 파싱
 */
function parseCsvFile(filePath: string): DonationRecord[] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${absolutePath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(absolutePath, 'utf-8')
  // BOM 제거
  const cleanContent = content.replace(/^\uFEFF/, '')
  const lines = cleanContent.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)

  const records: DonationRecord[] = []

  // 첫 번째 줄은 헤더
  // 후원시간,후원 아이디(닉네임),후원하트,참여BJ,하트점수,기여도,기타
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((col) => col.trim())
    if (cols.length < 6) continue

    const donatedAt = new Date(cols[0])
    const { id: donorId, nickname: donorName } = extractNickname(cols[1])
    const amount = parseInt(cols[2].replace(/,/g, ''), 10) || 0
    const memberName = cleanMemberName(cols[3])
    const heartScore = parseInt(cols[4].replace(/,/g, ''), 10) || 0
    const contribution = parseInt(cols[5].replace(/,/g, ''), 10) || 0

    // 유효성 검사
    if (isNaN(donatedAt.getTime())) {
      console.warn(`⚠️  라인 ${i + 1}: 날짜 파싱 실패 - ${cols[0]}`)
      continue
    }

    // 대표BJ 후원은 제외 (팀 내부 이동)
    if (memberName.includes('RG_family') || memberName.includes('대표BJ')) {
      continue
    }

    records.push({
      donatedAt,
      donorId,
      donorName,
      amount,
      memberName,
      heartScore,
      contribution,
    })
  }

  return records
}

/**
 * 다음 에피소드 번호 조회
 */
async function getNextEpisodeNumber(seasonId: number): Promise<number> {
  const { data, error } = await supabase
    .from('episodes')
    .select('episode_number')
    .eq('season_id', seasonId)
    .order('episode_number', { ascending: false })
    .limit(1)

  if (error) {
    console.error('❌ 에피소드 조회 실패:', error.message)
    return 1
  }

  if (!data || data.length === 0) {
    return 1
  }

  return data[0].episode_number + 1
}

/**
 * 중복 임포트 체크
 */
async function checkDuplicateImport(sourceFile: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('episodes')
    .select('id')
    .eq('source_file', sourceFile)
    .limit(1)

  if (error) {
    console.error('⚠️  중복 체크 실패:', error.message)
    return false
  }

  return data && data.length > 0
}

/**
 * 에피소드 생성
 */
async function createEpisode(
  seasonId: number,
  episodeNumber: number,
  title: string,
  broadcastDate: Date,
  sourceFile: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('episodes')
    .insert({
      season_id: seasonId,
      episode_number: episodeNumber,
      title: title || `${episodeNumber}화`,
      broadcast_date: broadcastDate.toISOString().split('T')[0],
      source_file: sourceFile,
    })
    .select('id')
    .single()

  if (error) {
    console.error('❌ 에피소드 생성 실패:', error.message)
    return null
  }

  return data.id
}

/**
 * 후원 내역 일괄 삽입
 * 기존 donations 스키마와 호환: season_id, target_bj 포함
 */
async function insertDonations(
  records: DonationRecord[],
  episodeId: number,
  seasonId: number
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  // 배치 처리 (100개씩)
  const batchSize = 100
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const insertData = batch.map((r) => ({
      donor_name: r.donorName,
      amount: r.amount,
      season_id: seasonId,
      episode_id: episodeId,
      target_bj: r.memberName,      // 기존 스키마 호환 (analytics.ts 등에서 사용)
      member_name: r.memberName,    // 새 필드 (CSV 원본 데이터)
      heart_score: r.heartScore,    // 새 필드
      donated_at: r.donatedAt.toISOString(),
    }))

    const { error } = await supabase.from('donations').insert(insertData)

    if (error) {
      console.error(`❌ 배치 삽입 실패 (${i}-${i + batch.length}):`, error.message)
      failed += batch.length
    } else {
      success += batch.length
    }
  }

  return { success, failed }
}

/**
 * 에피소드 통계 업데이트
 */
async function updateEpisodeStats(episodeId: number): Promise<void> {
  // 해당 에피소드의 총 하트와 후원자 수 계산
  const { data, error } = await supabase
    .from('donations')
    .select('amount, donor_name')
    .eq('episode_id', episodeId)

  if (error || !data) {
    console.error('⚠️  통계 계산 실패:', error?.message)
    return
  }

  const totalHearts = data.reduce((sum, d) => sum + (d.amount > 0 ? d.amount : 0), 0)
  const uniqueDonors = new Set(data.map((d) => d.donor_name)).size

  const { error: updateError } = await supabase
    .from('episodes')
    .update({
      total_hearts: totalHearts,
      donor_count: uniqueDonors,
    })
    .eq('id', episodeId)

  if (updateError) {
    console.error('⚠️  에피소드 통계 업데이트 실패:', updateError.message)
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 후원 내역 CSV 임포트 시작\n')

  const { filePath, seasonId, episodeNumber, episodeId: existingEpisodeId, title, dryRun } = parseArgs()
  const sourceFile = path.basename(filePath)

  if (dryRun) {
    console.log('⚠️  DRY-RUN 모드: 실제 저장 없이 미리보기만 실행합니다.\n')
  }

  // 1. 중복 체크 (기존 에피소드 사용시 스킵)
  console.log(`📄 파일: ${sourceFile}`)
  if (!existingEpisodeId) {
    const isDuplicate = await checkDuplicateImport(sourceFile)
    if (isDuplicate) {
      console.error(`❌ 이미 임포트된 파일입니다: ${sourceFile}`)
      console.error('   중복 임포트를 원하면 episodes 테이블에서 해당 source_file을 삭제하세요.')
      process.exit(1)
    }
  }

  // 2. CSV 파싱
  console.log('📊 CSV 파싱 중...')
  const records = parseCsvFile(filePath)
  console.log(`   ${records.length}건의 후원 내역 발견`)

  if (records.length === 0) {
    console.error('❌ 후원 내역이 없습니다.')
    process.exit(1)
  }

  // 3. 에피소드 정보 결정
  let finalEpisodeNumber = episodeNumber
  let finalSeasonId = seasonId

  if (existingEpisodeId) {
    // 기존 에피소드 정보 조회
    const { data: existingEp, error } = await supabase
      .from('episodes')
      .select('season_id, episode_number, title')
      .eq('id', existingEpisodeId)
      .single()

    if (error || !existingEp) {
      console.error(`❌ 에피소드 ID ${existingEpisodeId}를 찾을 수 없습니다.`)
      process.exit(1)
    }

    finalSeasonId = existingEp.season_id
    finalEpisodeNumber = existingEp.episode_number
    console.log(`   기존 에피소드 사용: ${existingEp.title} (ID: ${existingEpisodeId})`)
  } else if (finalEpisodeNumber === 0) {
    finalEpisodeNumber = await getNextEpisodeNumber(seasonId)
    console.log(`   자동 에피소드 번호: ${finalEpisodeNumber}`)
  }

  // 4. 방송 날짜 추출 (첫 번째 후원의 날짜)
  const broadcastDate = records[0].donatedAt

  // 5. 통계 미리보기
  const totalHearts = records.reduce((sum, r) => sum + (r.amount > 0 ? r.amount : 0), 0)
  const uniqueDonors = new Set(records.map((r) => r.donorName)).size
  const topDonors = [...records.reduce((map, r) => {
    const current = map.get(r.donorName) || 0
    map.set(r.donorName, current + r.amount)
    return map
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  console.log('\n📊 통계:')
  console.log(`   시즌: ${finalSeasonId}`)
  console.log(`   회차: ${finalEpisodeNumber}화`)
  console.log(`   제목: ${title || `${finalEpisodeNumber}화`}`)
  console.log(`   방송일: ${broadcastDate.toISOString().split('T')[0]}`)
  console.log(`   총 하트: ${totalHearts.toLocaleString()}`)
  console.log(`   후원자 수: ${uniqueDonors}명`)
  console.log(`   후원 건수: ${records.length}건`)

  console.log('\n🏆 Top 10:')
  topDonors.forEach(([name, amount], i) => {
    console.log(`   ${i + 1}. ${name}: ${amount.toLocaleString()}`)
  })

  if (dryRun) {
    console.log('\n💡 실제 저장하려면 --dry-run 옵션 없이 다시 실행하세요.')
    return
  }

  // 6. 에피소드 생성 또는 기존 사용
  let episodeId: number

  if (existingEpisodeId) {
    episodeId = existingEpisodeId
    console.log(`\n📝 기존 에피소드 사용 (ID: ${episodeId})`)

    // source_file 업데이트
    await supabase
      .from('episodes')
      .update({ source_file: sourceFile })
      .eq('id', episodeId)
  } else {
    console.log('\n📝 에피소드 생성 중...')
    const newEpisodeId = await createEpisode(
      finalSeasonId,
      finalEpisodeNumber,
      title || `${finalEpisodeNumber}화`,
      broadcastDate,
      sourceFile
    )

    if (!newEpisodeId) {
      console.error('❌ 에피소드 생성 실패')
      process.exit(1)
    }
    episodeId = newEpisodeId
    console.log(`   ✅ 에피소드 생성 완료 (ID: ${episodeId})`)
  }

  // 7. 후원 내역 삽입
  console.log('\n📥 후원 내역 삽입 중...')
  const { success, failed } = await insertDonations(records, episodeId, finalSeasonId)
  console.log(`   ✅ 성공: ${success}건`)
  if (failed > 0) {
    console.log(`   ❌ 실패: ${failed}건`)
  }

  // 8. 에피소드 통계 업데이트
  console.log('\n📈 에피소드 통계 업데이트 중...')
  await updateEpisodeStats(episodeId)
  console.log('   ✅ 완료')

  // 완료
  console.log('\n' + '━'.repeat(60))
  console.log('✅ 임포트 완료!')
  console.log(`   시즌 ${finalSeasonId} - ${finalEpisodeNumber}화`)
  console.log(`   총 ${success}건의 후원 내역이 추가되었습니다.`)
  console.log('━'.repeat(60))
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err)
  process.exit(1)
})
