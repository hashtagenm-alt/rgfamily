/**
 * EP6 DB 저장 스크립트
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = getServiceClient()

const TITLE = '엑셀부 시즌1_06화'

const PARTS = [
  { partNumber: 1, uid: '362bf90242fe0f0ecf3a83326c4963e0', duration: 21600 },
  { partNumber: 2, uid: 'eda2fe4e8e4290751dad50f0b073863b', duration: 21600 },
  { partNumber: 3, uid: '0124673cf7b086b9cc695cbc8c2d496a', duration: 5497 },
]

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🎬 EP6 DB 저장')
  console.log('═══════════════════════════════════════════════════════════')

  let parentId: number | undefined

  for (const part of PARTS) {
    console.log(`\n📺 Part ${part.partNumber} 저장 중...`)

    const { data, error } = await supabase
      .from('media_content')
      .insert({
        content_type: 'vod',
        title: `${TITLE} (Part ${part.partNumber})`,
        video_url: `https://iframe.videodelivery.net/${part.uid}`,
        cloudflare_uid: part.uid,
        duration: part.duration,
        parent_id: parentId || null,
        part_number: part.partNumber,
        total_parts: PARTS.length,
        unit: 'excel',
      })
      .select()
      .single()

    if (error) {
      console.error(`   ❌ 실패:`, error.message)
      continue
    }

    console.log(`   ✅ 저장 완료 (ID: ${data.id})`)

    if (part.partNumber === 1) {
      parentId = data.id
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('✅ EP6 DB 저장 완료!')
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
