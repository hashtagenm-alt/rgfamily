/**
 * signature_videos.video_url을 Cloudflare URL로 정리
 * cloudflare_uid가 있는 레코드의 video_url을 Cloudflare iframe URL로 업데이트
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('════════════════════════════════════════════════════════════')
  console.log('🔄 signature_videos.video_url → Cloudflare URL 마이그레이션')
  console.log('════════════════════════════════════════════════════════════\n')

  // cloudflare_uid가 있는 모든 레코드 조회
  const { data: videos, error } = await supabase
    .from('signature_videos')
    .select('id, video_url, cloudflare_uid')
    .not('cloudflare_uid', 'is', null)

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    process.exit(1)
  }

  if (!videos || videos.length === 0) {
    console.log('⚠️  cloudflare_uid가 있는 레코드가 없습니다.')
    return
  }

  console.log(`📊 대상 레코드: ${videos.length}개\n`)

  // Supabase URL을 가진 레코드만 필터링
  const supabaseVideos = videos.filter(v =>
    v.video_url?.includes('supabase.co/storage')
  )

  console.log(`📦 Supabase URL 레코드: ${supabaseVideos.length}개`)
  console.log(`☁️  이미 Cloudflare URL: ${videos.length - supabaseVideos.length}개\n`)

  if (supabaseVideos.length === 0) {
    console.log('✅ 모든 레코드가 이미 Cloudflare URL을 사용 중입니다.')
    return
  }

  // 업데이트 실행
  let success = 0
  let failed = 0

  for (const video of supabaseVideos) {
    const cloudflareUrl = `https://iframe.videodelivery.net/${video.cloudflare_uid}`

    const { error: updateError } = await supabase
      .from('signature_videos')
      .update({ video_url: cloudflareUrl })
      .eq('id', video.id)

    if (updateError) {
      console.error(`   ❌ ID ${video.id} 실패:`, updateError.message)
      failed++
    } else {
      success++
      process.stdout.write(`\r   ✅ 진행: ${success}/${supabaseVideos.length}`)
    }
  }

  console.log('\n')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개`)
  console.log('════════════════════════════════════════════════════════════')

  // 결과 확인
  const { data: check } = await supabase
    .from('signature_videos')
    .select('id, video_url')
    .limit(5)

  console.log('\n📋 샘플 확인:')
  check?.forEach(v => {
    const urlType = v.video_url?.includes('videodelivery.net') ? '☁️ Cloudflare' : '📦 기타'
    console.log(`   ${urlType} ID ${v.id}: ${v.video_url?.slice(0, 50)}...`)
  })
}

main().catch(console.error)
