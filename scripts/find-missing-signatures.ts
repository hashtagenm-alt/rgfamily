/**
 * Google Drive와 DB 비교하여 누락된 시그니처 영상 찾기
 * 1만 하트 이상의 영상 중 signature_videos에 없는 것 확인
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function main() {
  console.log('=== 시그니처 영상 현황 분석 ===\n')

  // 1. 현재 DB에 등록된 시그니처 영상 조회
  const { data: videos, error } = await supabase
    .from('signature_videos')
    .select(`
      id,
      cloudflare_uid,
      signatures(sig_number),
      organization(name)
    `)
    .order('id')

  if (error || !videos) {
    console.error('DB 조회 실패:', error?.message)
    return
  }

  // 멤버별로 등록된 sig_number 정리
  const registeredByMember: Record<string, number[]> = {}

  videos.forEach(v => {
    const member = (v.organization as { name: string } | null)?.name || 'Unknown'
    const sigNum = (v.signatures as { sig_number: number } | null)?.sig_number || 0

    if (!registeredByMember[member]) registeredByMember[member] = []
    registeredByMember[member].push(sigNum)
  })

  console.log('=== 현재 DB에 등록된 시그니처 영상 ===')
  console.log(`총 ${videos.length}개\n`)

  // 멤버별 출력 (1만 이상만 필터링)
  const members = Object.keys(registeredByMember).sort()

  members.forEach(member => {
    const sigs = registeredByMember[member].sort((a, b) => a - b)
    const over10k = sigs.filter(s => s >= 10000)
    const under10k = sigs.filter(s => s < 10000)

    console.log(`\n【${member}】 총 ${sigs.length}개`)
    console.log(`  1만 이상 (${over10k.length}개): ${over10k.join(', ') || '없음'}`)
    console.log(`  1만 미만 (${under10k.length}개): ${under10k.join(', ') || '없음'}`)
  })

  // 2. signatures 테이블에서 1만 이상의 시그니처 목록 조회
  const { data: allSignatures, error: sigError } = await supabase
    .from('signatures')
    .select('id, sig_number, organization(name)')
    .gte('sig_number', 10000)
    .order('sig_number')

  if (sigError) {
    console.error('\n시그니처 목록 조회 실패:', sigError.message)
    return
  }

  console.log('\n\n=== signatures 테이블의 1만+ 시그니처 ===')
  console.log(`총 ${allSignatures?.length || 0}개`)

  // 3. signature_videos에 없는 시그니처 찾기
  const registeredSigIds = new Set(
    videos.map(v => (v.signatures as { sig_number: number } | null)?.sig_number).filter(Boolean)
  )

  const missingSigs = allSignatures?.filter(s => !registeredSigIds.has(s.sig_number)) || []

  console.log('\n\n=== 영상 누락된 1만+ 시그니처 ===')
  console.log(`총 ${missingSigs.length}개\n`)

  if (missingSigs.length > 0) {
    // 멤버별로 그룹화
    const missingByMember: Record<string, number[]> = {}
    missingSigs.forEach(s => {
      const member = (s.organization as { name: string } | null)?.name || 'Unknown'
      if (!missingByMember[member]) missingByMember[member] = []
      missingByMember[member].push(s.sig_number)
    })

    Object.entries(missingByMember)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([member, sigs]) => {
        sigs.sort((a, b) => a - b)
        console.log(`${member}: ${sigs.join(', ')}`)
      })

    console.log('\n=== Google Drive에서 찾아야 할 파일 ===')
    Object.entries(missingByMember)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([member, sigs]) => {
        sigs.sort((a, b) => a - b)
        sigs.forEach(sig => {
          console.log(`${member} 폴더 → ${sig} 또는 ${sig.toLocaleString()} 파일`)
        })
      })
  } else {
    console.log('모든 1만+ 시그니처가 영상으로 등록되어 있습니다!')
  }
}

main().catch(console.error)
