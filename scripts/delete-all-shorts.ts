/**
 * 모든 숏츠 삭제 (Cloudflare + DB)
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
  console.log('=== 모든 숏츠 삭제 ===\n')

  const { data: shorts } = await supabase
    .from('media_content')
    .select('id, title, cloudflare_uid')
    .eq('content_type', 'shorts')

  if (!shorts || shorts.length === 0) {
    console.log('삭제할 숏츠가 없습니다.')
    return
  }

  console.log(`${shorts.length}개 숏츠 삭제 중...\n`)

  let deleted = 0

  for (const short of shorts) {
    process.stdout.write(`[${deleted + 1}/${shorts.length}] ${short.title}`)

    // Cloudflare에서 영상 삭제
    if (short.cloudflare_uid) {
      try {
        await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${short.cloudflare_uid}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`
          }
        })
        process.stdout.write(' ☁️')
      } catch (e) {
        process.stdout.write(' ⚠️')
      }
    }

    // DB에서 삭제
    const { error } = await supabase
      .from('media_content')
      .delete()
      .eq('id', short.id)

    if (error) {
      console.log(` ❌ ${error.message}`)
    } else {
      console.log(' ✅')
      deleted++
    }
  }

  console.log(`\n완료: ${deleted}개 삭제됨`)
}

main().catch(console.error)
