/**
 * 멤버별 1만+ 시그니처 영상 누락 현황
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function main() {
  // 1. 모든 1만+ 시그니처 조회
  const { data: sigs } = await supabase
    .from('signatures')
    .select('id, sig_number, title')
    .gte('sig_number', 10000)
    .order('sig_number')

  // 2. 모든 멤버 조회
  const { data: members } = await supabase
    .from('organization')
    .select('id, name')
    .order('name')

  // 3. 현재 등록된 (signature_id, member_id) 조합
  const { data: videos } = await supabase
    .from('signature_videos')
    .select('signature_id, member_id, signatures(sig_number), organization(name)')

  if (!sigs || !members || !videos) {
    console.error('데이터 조회 실패')
    return
  }

  console.log('=== 1만+ 시그니처 영상 누락 현황 ===\n')
  console.log(`시그니처 수: ${sigs.length}개`)
  console.log(`멤버 수: ${members.length}개`)
  console.log(`등록된 영상: ${videos.length}개`)
  console.log(`가능한 조합: ${sigs.length} × ${members.length} = ${sigs.length * members.length}개\n`)

  // 등록된 (sig_number, member_name) 조합 Set
  const registered = new Set<string>()
  videos.forEach(v => {
    const sigNum = (v.signatures as any)?.sig_number
    const memberName = (v.organization as any)?.name
    if (sigNum && memberName) {
      registered.add(`${sigNum}|${memberName}`)
    }
  })

  // 4. 멤버별 누락 시그니처 확인
  console.log('=== 멤버별 누락 현황 ===\n')

  let totalMissing = 0
  const missingList: Array<{ member: string; sigNumber: number; sigTitle: string }> = []

  for (const member of members) {
    const missing: number[] = []
    const existing: number[] = []

    for (const sig of sigs) {
      const key = `${sig.sig_number}|${member.name}`
      if (registered.has(key)) {
        existing.push(sig.sig_number)
      } else {
        missing.push(sig.sig_number)
        missingList.push({
          member: member.name,
          sigNumber: sig.sig_number,
          sigTitle: sig.title
        })
      }
    }

    if (missing.length > 0) {
      console.log(`【${member.name}】 등록: ${existing.length}개, 누락: ${missing.length}개`)
      console.log(`  누락: ${missing.join(', ')}`)
      totalMissing += missing.length
    } else {
      console.log(`【${member.name}】 모든 시그니처 등록 완료 (${existing.length}개)`)
    }
  }

  console.log(`\n=== 총 누락: ${totalMissing}개 ===`)
  console.log(`\n=== Google Drive에서 찾아야 할 파일 목록 ===`)

  missingList.forEach(m => {
    console.log(`${m.member} 폴더 → ${m.sigNumber} ${m.member}.mp4`)
  })
}

main().catch(console.error)
