/**
 * 시그니처 자격 관리 스크립트
 *
 * 기준:
 * - 1번째 시그: 당일 누적 10만+ 하트
 * - 2번째 시그: 1번째 이후 회차에서 당일 15만+ 하트
 * - 3번째 시그: 2번째 이후 회차에서 당일 20만+ 하트
 *
 * 사용법:
 *   npx tsx scripts/manage-signature-eligibility.ts --analyze     # 분석만
 *   npx tsx scripts/manage-signature-eligibility.ts --sync        # DB 동기화
 *   npx tsx scripts/manage-signature-eligibility.ts --claim=닉네임 --sig=1  # 수령 처리
 */

import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

// 시그니처 획득 기준
const SIG_THRESHOLDS: Record<number, number> = {
  1: 100000,  // 1번째 시그: 10만 하트
  2: 150000,  // 2번째 시그: 15만 하트
  3: 200000,  // 3번째 시그: 20만 하트
}

interface EpisodeDonation {
  episode_id: number
  episode_number: number
  donor_name: string
  total: number
}

interface SignatureRecord {
  sigNumber: number
  episode_id: number
  episode_number: number
  amount: number
}

interface DonorSignatures {
  [donorName: string]: SignatureRecord[]
}

async function getEpisodeDonorTotals(): Promise<EpisodeDonation[]> {
  // 에피소드 정보
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number')
    .order('episode_number')

  const episodeMap = new Map(episodes?.map(e => [e.id, e.episode_number]) || [])

  // 후원 데이터 (Supabase 기본 limit 1000건 → 전체 데이터 가져오기)
  let allDonations: { episode_id: number; donor_name: string; amount: number }[] = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data: page } = await supabase
      .from('donations')
      .select('episode_id, donor_name, amount')
      .range(offset, offset + pageSize - 1)

    if (!page || page.length === 0) break
    allDonations = allDonations.concat(page)
    if (page.length < pageSize) break
    offset += pageSize
  }

  const donations = allDonations

  // 에피소드별 + 후원자별 집계
  const totals: Record<string, EpisodeDonation> = {}
  for (const d of donations || []) {
    const key = `${d.episode_id}|${d.donor_name}`
    if (!totals[key]) {
      totals[key] = {
        episode_id: d.episode_id,
        episode_number: episodeMap.get(d.episode_id) || 0,
        donor_name: d.donor_name,
        total: 0
      }
    }
    totals[key].total += d.amount
  }

  return Object.values(totals)
    .filter(d => d.total >= SIG_THRESHOLDS[1])
    .sort((a, b) => a.episode_number - b.episode_number || b.total - a.total)
}

function calculateSignatures(donations: EpisodeDonation[]): DonorSignatures {
  // 후원자별 이력 그룹화
  const donorHistory: Record<string, EpisodeDonation[]> = {}
  for (const d of donations) {
    if (!donorHistory[d.donor_name]) donorHistory[d.donor_name] = []
    donorHistory[d.donor_name].push(d)
  }

  // 시그니처 자격 계산
  const result: DonorSignatures = {}

  for (const [name, history] of Object.entries(donorHistory)) {
    history.sort((a, b) => a.episode_number - b.episode_number)
    result[name] = []

    for (const h of history) {
      const currentCount = result[name].length
      const nextSig = currentCount + 1

      if (nextSig > 3) continue

      const threshold = SIG_THRESHOLDS[nextSig]
      if (h.total >= threshold) {
        result[name].push({
          sigNumber: nextSig,
          episode_id: h.episode_id,
          episode_number: h.episode_number,
          amount: h.total
        })
      }
    }
  }

  return result
}

async function analyze() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏆 시그니처 자격 분석')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('기준: 1번째=10만+, 2번째=15만+, 3번째=20만+')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const donations = await getEpisodeDonorTotals()
  const signatures = calculateSignatures(donations)

  // 시그 개수별 분류
  const groups = { 3: [] as string[], 2: [] as string[], 1: [] as string[] }
  for (const [name, sigs] of Object.entries(signatures)) {
    const count = Math.min(sigs.length, 3) as 1 | 2 | 3
    if (count > 0) groups[count].push(name)
  }

  // 3개 시그
  console.log(`🏆🏆🏆 3개 시그니처 (${groups[3].length}명)`)
  console.log('─'.repeat(50))
  for (const name of groups[3]) {
    const sigs = signatures[name]
    console.log(`\n${name}:`)
    for (const s of sigs) {
      console.log(`  ${s.sigNumber}번째: EP${s.episode_number} (${s.amount.toLocaleString()} 하트)`)
    }
  }

  // 2개 시그
  console.log(`\n\n🏆🏆 2개 시그니처 (${groups[2].length}명)`)
  console.log('─'.repeat(50))
  for (const name of groups[2]) {
    const sigs = signatures[name]
    console.log(`\n${name}:`)
    for (const s of sigs) {
      console.log(`  ${s.sigNumber}번째: EP${s.episode_number} (${s.amount.toLocaleString()} 하트)`)
    }
  }

  // 1개 시그
  console.log(`\n\n🏆 1개 시그니처 (${groups[1].length}명)`)
  console.log('─'.repeat(50))
  for (const name of groups[1]) {
    const sigs = signatures[name]
    console.log(`${name}: EP${sigs[0].episode_number} (${sigs[0].amount.toLocaleString()} 하트)`)
  }

  // 요약
  const total = groups[3].length + groups[2].length + groups[1].length
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 총 ${total}명 자격자`)
  console.log(`   3개: ${groups[3].length}명, 2개: ${groups[2].length}명, 1개: ${groups[1].length}명`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  return { donations, signatures, groups }
}

async function syncToDatabase() {
  console.log('📥 시그니처 자격 DB 동기화 시작...\n')

  const { signatures } = await analyze()

  // 프로필 매핑
  const { data: profiles } = await supabase.from('profiles').select('id, nickname')
  const profileMap = new Map(profiles?.map(p => [p.nickname, p.id]) || [])

  let inserted = 0
  let skipped = 0

  for (const [name, sigs] of Object.entries(signatures)) {
    for (const sig of sigs) {
      // 이미 존재하는지 확인
      const { data: existing } = await supabase
        .from('signature_eligibility')
        .select('id')
        .eq('donor_name', name)
        .eq('sig_number', sig.sigNumber)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // 새로 삽입
      const { error } = await supabase.from('signature_eligibility').insert({
        profile_id: profileMap.get(name) || null,
        donor_name: name,
        sig_number: sig.sigNumber,
        episode_id: sig.episode_id,
        episode_number: sig.episode_number,
        daily_amount: sig.amount,
        threshold_amount: SIG_THRESHOLDS[sig.sigNumber],
        is_claimed: false
      })

      if (error) {
        console.log(`❌ ${name} ${sig.sigNumber}번째 시그 삽입 실패: ${error.message}`)
      } else {
        console.log(`✅ ${name} ${sig.sigNumber}번째 시그 등록`)
        inserted++
      }
    }
  }

  console.log(`\n📊 결과: ${inserted}건 추가, ${skipped}건 스킵 (이미 존재)`)
}

async function markClaimed(donorName: string, sigNumber: number) {
  console.log(`📝 ${donorName} ${sigNumber}번째 시그니처 수령 처리...`)

  const { data, error } = await supabase
    .from('signature_eligibility')
    .update({ is_claimed: true, claimed_at: new Date().toISOString() })
    .eq('donor_name', donorName)
    .eq('sig_number', sigNumber)
    .select()
    .single()

  if (error) {
    console.log(`❌ 실패: ${error.message}`)
  } else if (data) {
    console.log(`✅ 수령 처리 완료`)
    console.log(`   EP${data.episode_number}: ${data.daily_amount.toLocaleString()} 하트`)
  } else {
    console.log(`⚠️ 해당 자격 기록을 찾을 수 없습니다.`)
  }
}

async function showStatus() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 시그니처 자격 현황 (DB 기준)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const { data } = await supabase
    .from('signature_eligibility')
    .select('*')
    .order('donor_name')
    .order('sig_number')

  if (!data || data.length === 0) {
    console.log('등록된 자격 기록이 없습니다.')
    console.log('--sync 옵션으로 동기화하세요.')
    return
  }

  // 후원자별 그룹화
  const byDonor: Record<string, typeof data> = {}
  for (const d of data) {
    if (!byDonor[d.donor_name]) byDonor[d.donor_name] = []
    byDonor[d.donor_name].push(d)
  }

  for (const [name, records] of Object.entries(byDonor)) {
    const sigCount = records.length
    const emoji = '🏆'.repeat(sigCount)
    const claimedCount = records.filter(r => r.is_claimed).length

    console.log(`${emoji} ${name} (${claimedCount}/${sigCount} 수령)`)
    for (const r of records) {
      const status = r.is_claimed ? '✅ 수령' : '⏳ 대기'
      console.log(`  ${r.sig_number}번째: EP${r.episode_number} ${r.daily_amount.toLocaleString()}하트 [${status}]`)
    }
    console.log('')
  }
}

// 메인
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.length === 0) {
    console.log(`
시그니처 자격 관리 스크립트

사용법:
  npx tsx scripts/manage-signature-eligibility.ts [옵션]

옵션:
  --analyze       donations 기반 자격 분석 (DB 변경 없음)
  --status        DB에 저장된 자격 현황 조회
  --sync          분석 결과를 DB에 동기화
  --claim=닉네임  시그니처 수령 처리
  --sig=번호      수령 처리할 시그 번호 (1, 2, 3)

기준:
  1번째 시그: 당일 누적 10만+ 하트
  2번째 시그: 1번째 이후 회차에서 당일 15만+ 하트
  3번째 시그: 2번째 이후 회차에서 당일 20만+ 하트

예시:
  npx tsx scripts/manage-signature-eligibility.ts --analyze
  npx tsx scripts/manage-signature-eligibility.ts --sync
  npx tsx scripts/manage-signature-eligibility.ts --claim=르큐리 --sig=1
`)
    return
  }

  if (args.includes('--analyze')) {
    await analyze()
  } else if (args.includes('--status')) {
    await showStatus()
  } else if (args.includes('--sync')) {
    await syncToDatabase()
  } else if (args.some(a => a.startsWith('--claim='))) {
    const claimArg = args.find(a => a.startsWith('--claim='))
    const sigArg = args.find(a => a.startsWith('--sig='))
    if (!claimArg || !sigArg) {
      console.log('--claim과 --sig 옵션을 함께 사용하세요.')
      return
    }
    const donorName = claimArg.replace('--claim=', '')
    const sigNumber = parseInt(sigArg.replace('--sig=', ''), 10)
    await markClaimed(donorName, sigNumber)
  }
}

main().catch(console.error)
