/**
 * 영상 미등록 1만+ 시그니처 찾기
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function main() {
  // 1. signatures 테이블에서 1만+ 시그니처 전체 조회
  const { data: allSigs, error: sigErr } = await supabase
    .from('signatures')
    .select('id, sig_number, title')
    .gte('sig_number', 10000)
    .order('sig_number')

  if (sigErr) {
    console.error('signatures 조회 실패:', sigErr.message)
    return
  }

  // 2. signature_videos에서 등록된 signature_id 조회
  const { data: videos, error: vidErr } = await supabase
    .from('signature_videos')
    .select('signature_id, signatures(sig_number), organization(name)')

  if (vidErr) {
    console.error('signature_videos 조회 실패:', vidErr.message)
    return
  }

  const registeredSigIds = new Set(videos?.map(v => v.signature_id))

  console.log('=== 1만+ 시그니처 현황 ===')
  console.log('signatures 테이블 1만+ 개수:', allSigs?.length || 0)
  console.log('signature_videos 등록된 영상:', videos?.length || 0)

  // 3. 영상이 없는 1만+ 시그니처
  const missingSigs = allSigs?.filter(s => !registeredSigIds.has(s.id)) || []

  console.log('\n=== 영상 미등록 1만+ 시그니처 ===')
  console.log('총', missingSigs.length, '개\n')

  if (missingSigs.length > 0) {
    missingSigs.forEach(s => {
      console.log(`sig${s.sig_number} - ${s.title}`)
    })

    console.log('\n=== Google Drive에서 찾아야 할 파일 목록 ===')
    missingSigs.forEach(s => {
      // 제목에서 멤버명 추출 시도
      const titleParts = s.title.split(' - ')
      const memberHint = titleParts.length > 1 ? titleParts[1] : '확인필요'
      console.log(`${s.sig_number} (${memberHint})`)
    })
  } else {
    console.log('모든 1만+ 시그니처에 영상이 등록되어 있습니다!')
  }
}

main().catch(console.error)
