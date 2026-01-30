/**
 * 시그니처 영상 동기화 스크립트
 * signature_videos → signatures.video_url 업데이트
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function main() {
  console.log('═'.repeat(60))
  console.log('🔄 시그니처 영상 동기화')
  console.log('═'.repeat(60))

  // Get all signature_videos with cloudflare_uid and signature_id
  const { data: videos, error: vErr } = await supabase
    .from('signature_videos')
    .select('id, signature_id, cloudflare_uid')
    .not('signature_id', 'is', null)
    .not('cloudflare_uid', 'is', null)

  if (vErr) {
    console.error('❌ signature_videos 조회 실패:', vErr.message)
    return
  }

  if (!videos || videos.length === 0) {
    console.log('연결된 영상이 없습니다.')
    return
  }

  console.log(`\n📹 연결된 영상: ${videos.length}개`)
  console.log('')

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const video of videos) {
    const videoUrl = `https://iframe.videodelivery.net/${video.cloudflare_uid}`

    // Check current state
    const { data: sig } = await supabase
      .from('signatures')
      .select('id, title, video_url')
      .eq('id', video.signature_id)
      .single()

    if (!sig) {
      console.log(`⚠️  시그니처 ID ${video.signature_id} 없음`)
      failed++
      continue
    }

    if (sig.video_url) {
      // Already has video_url
      skipped++
      continue
    }

    // Update signatures with video_url
    const { error: uErr } = await supabase
      .from('signatures')
      .update({ video_url: videoUrl })
      .eq('id', video.signature_id)

    if (uErr) {
      console.log(`❌ 업데이트 실패 (${sig.title}): ${uErr.message}`)
      failed++
    } else {
      console.log(`✅ ${sig.title} - video_url 추가`)
      updated++
    }
  }

  console.log('')
  console.log('─'.repeat(60))
  console.log(`📊 결과: 업데이트 ${updated}개 | 스킵 ${skipped}개 | 실패 ${failed}개`)
  console.log('═'.repeat(60))
}

main().catch(console.error)
