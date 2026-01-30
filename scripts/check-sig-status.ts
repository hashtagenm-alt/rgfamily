/**
 * 시그니처 영상 상태 확인
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
  console.log('📊 시그니처 영상 상태')
  console.log('═'.repeat(60))

  // Count signature_videos
  const { count: videoCount } = await supabase
    .from('signature_videos')
    .select('*', { count: 'exact', head: true })

  // Count signatures
  const { count: sigCount } = await supabase
    .from('signatures')
    .select('*', { count: 'exact', head: true })

  console.log('')
  console.log('📈 테이블 현황:')
  console.log(`   signatures: ${sigCount}개`)
  console.log(`   signature_videos: ${videoCount}개`)

  // Get recent uploads
  const { data: recent } = await supabase
    .from('signature_videos')
    .select('id, signature_id, cloudflare_uid, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (recent && recent.length > 0) {
    console.log('')
    console.log('📋 최근 업로드 (10개):')
    console.log('─'.repeat(50))
    recent.forEach((v, i) => {
      const time = new Date(v.created_at).toLocaleString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      console.log(`   ${i + 1}. ID:${v.id} → sig:${v.signature_id} | ${time}`)
    })

    // Check how many uploaded today
    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabase
      .from('signature_videos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)

    console.log('')
    console.log(`📅 오늘 업로드: ${todayCount}개`)
  }

  // Check unlinked signatures
  const { data: unlinked } = await supabase
    .from('signatures')
    .select('id, title')
    .limit(500)

  if (unlinked) {
    const linkedSigs = new Set(
      (await supabase.from('signature_videos').select('signature_id')).data?.map(v => v.signature_id) || []
    )

    const notLinked = unlinked.filter(s => !linkedSigs.has(s.id))
    console.log('')
    console.log(`⚠️  영상 없는 시그니처: ${notLinked.length}개`)

    if (notLinked.length > 0 && notLinked.length <= 10) {
      notLinked.forEach(s => console.log(`   - [${s.id}] ${s.title}`))
    }
  }

  console.log('')
  console.log('═'.repeat(60))
}

main().catch(console.error)
