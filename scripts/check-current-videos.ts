/**
 * 현재 홈페이지에 있는 직캠 영상 목록 확인
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
const supabase = getServiceClient()

async function main() {
  // signature_videos 전체 조회
  const { data: videos, error } = await supabase
    .from('signature_videos')
    .select(`
      id,
      cloudflare_uid,
      video_url,
      created_at,
      signatures(sig_number),
      organization(name)
    `)
    .order('id', { ascending: true })

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('=== 현재 DB에 있는 직캠 영상 ===')
  console.log('총:', videos?.length, '개\n')

  // 멤버별 그룹화
  const byMember: Record<string, Array<{ sigNumber: number; uid: string; id: number }>> = {}
  videos?.forEach(v => {
    const member = (v.organization as { name: string } | null)?.name || 'Unknown'
    if (!byMember[member]) byMember[member] = []
    byMember[member].push({
      sigNumber: (v.signatures as { sig_number: number } | null)?.sig_number || 0,
      uid: v.cloudflare_uid || '',
      id: v.id
    })
  })

  // 멤버별 출력
  Object.entries(byMember)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([member, vids]) => {
      console.log(`${member} (${vids.length}개):`)
      vids.slice(0, 5).forEach(v => {
        const shortUid = v.uid ? v.uid.substring(0, 12) + '...' : 'NO_UID'
        console.log(`  - sig${v.sigNumber} [${shortUid}]`)
      })
      if (vids.length > 5) console.log(`  ... 외 ${vids.length - 5}개`)
    })

  // 로컬 직캠 폴더와 비교
  console.log('\n=== 로컬 직캠 폴더 현황 ===')
  const fancamFolder = path.join(__dirname, 'downloads/직캠')

  if (fs.existsSync(fancamFolder)) {
    const localFiles = fs.readdirSync(fancamFolder).filter(f => f.endsWith('.mp4'))
    console.log(`로컬 파일: ${localFiles.length}개`)

    // 멤버별 로컬 파일
    const localByMember: Record<string, string[]> = {}
    localFiles.forEach(f => {
      const match = f.match(/^(.+?)\s+\d+/)
      const member = match ? match[1] : 'Unknown'
      if (!localByMember[member]) localByMember[member] = []
      localByMember[member].push(f)
    })

    Object.entries(localByMember).forEach(([member, files]) => {
      console.log(`${member}: ${files.length}개`)
    })
  } else {
    console.log('로컬 직캠 폴더 없음:', fancamFolder)
  }
}

main().catch(console.error)
