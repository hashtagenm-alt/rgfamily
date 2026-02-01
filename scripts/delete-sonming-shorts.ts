/**
 * 손밍 관련 숏츠 삭제
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

async function main() {
  console.log('=== 손밍 관련 숏츠 확인 및 삭제 ===\n')

  const { data: shorts } = await supabase
    .from('media_content')
    .select('id, title, cloudflare_uid')
    .eq('content_type', 'shorts')
    .ilike('title', '%손밍%')

  if (!shorts || shorts.length === 0) {
    console.log('손밍 관련 숏츠가 없습니다.')
    return
  }

  console.log(`손밍 관련 숏츠 ${shorts.length}개 발견:\n`)
  shorts.forEach(s => {
    console.log(`  ID: ${s.id}, 제목: ${s.title}`)
  })

  console.log('\n삭제 중...')

  for (const short of shorts) {
    // Cloudflare에서 영상 삭제
    if (short.cloudflare_uid) {
      try {
        await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${short.cloudflare_uid}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`
          }
        })
        console.log(`  ☁️ Cloudflare 삭제: ${short.cloudflare_uid.substring(0, 8)}...`)
      } catch (e) {
        console.log(`  ⚠️ Cloudflare 삭제 실패`)
      }
    }

    // DB에서 삭제
    const { error } = await supabase
      .from('media_content')
      .delete()
      .eq('id', short.id)

    if (error) {
      console.log(`  ❌ DB 삭제 실패: ${error.message}`)
    } else {
      console.log(`  ✅ 삭제 완료: ${short.title}`)
    }
  }

  console.log('\n완료!')
}

main().catch(console.error)
