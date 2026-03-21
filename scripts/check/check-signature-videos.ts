/**
 * 시그니처 영상 확인 스크립트
 */
import { getServiceClient } from '../lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function main() {
  console.log('📹 시그니처 영상 현황')
  console.log('═'.repeat(60))

  // Get signature_videos
  const { data: videos, error: vErr } = await supabase
    .from('signature_videos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  if (vErr) {
    console.error('signature_videos 오류:', vErr.message)
  } else if (videos && videos.length > 0) {
    console.log(`\n📹 signature_videos 테이블 (${videos.length}개)`)
    console.log('─'.repeat(60))
    videos.forEach((v, i) => {
      console.log(`${i + 1}. ${v.title || v.file_name}`)
      console.log(`   ID: ${v.id} | UID: ${v.cloudflare_uid?.slice(0, 12)}...`)
      console.log(`   멤버: ${v.member_name || 'N/A'} | signature_id: ${v.signature_id || 'NULL'}`)
      console.log('')
    })
  } else {
    console.log('   signature_videos 테이블 비어있음')
  }

  // Get signatures
  const { data: sigs, error: sErr } = await supabase
    .from('signatures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (sErr) {
    console.error('signatures 오류:', sErr.message)
  } else if (sigs && sigs.length > 0) {
    console.log(`\n🎵 signatures 테이블 (${sigs.length}개)`)
    console.log('─'.repeat(60))
    sigs.forEach((s, i) => {
      console.log(`${i + 1}. ${s.title} (${s.member_name})`)
      console.log(`   ID: ${s.id} | video_url: ${s.video_url ? '있음' : 'NULL'}`)
      console.log('')
    })
  } else {
    console.log('\n   signatures 테이블 비어있음')
  }

  // Check unlinked videos
  const unlinked = videos?.filter(v => !v.signature_id) || []
  if (unlinked.length > 0) {
    console.log(`\n⚠️  시그니처에 연결되지 않은 영상: ${unlinked.length}개`)
    unlinked.forEach(v => {
      console.log(`   - ${v.title || v.file_name} (${v.member_name})`)
    })
  }
}

main().catch(console.error)
