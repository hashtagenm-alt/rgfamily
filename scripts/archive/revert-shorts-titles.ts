/**
 * 숏츠 제목을 원본 파일명 형식으로 되돌리기
 * "직캠(이름) 시그명" → "시그명 이름"
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = getServiceClient()

// "직캠(이름) 시그명" → "시그명 이름"
function revertTitle(title: string): string {
  const match = title.match(/^직캠\(([^)]+)\)\s+(.+)$/)
  if (match) {
    const dancerName = match[1]
    const sigName = match[2]
    return `${sigName} ${dancerName}`
  }
  return title
}

async function main() {
  console.log('=== 숏츠 제목 원본으로 되돌리기 ===\n')

  const { data: shorts } = await supabase
    .from('media_content')
    .select('id, title')
    .eq('content_type', 'shorts')
    .order('id')

  if (!shorts || shorts.length === 0) {
    console.log('숏츠가 없습니다.')
    return
  }

  console.log('ID'.padEnd(6) + '현재 제목'.padEnd(30) + '→ 원본 제목')
  console.log('-'.repeat(70))

  let updated = 0

  for (const short of shorts) {
    const originalTitle = revertTitle(short.title)

    if (originalTitle !== short.title) {
      const { error } = await supabase
        .from('media_content')
        .update({ title: originalTitle })
        .eq('id', short.id)

      if (error) {
        console.log(`${String(short.id).padEnd(6)}❌ ${short.title} - ${error.message}`)
      } else {
        console.log(`${String(short.id).padEnd(6)}${short.title.padEnd(30)}→ ${originalTitle}`)
        updated++
      }
    } else {
      console.log(`${String(short.id).padEnd(6)}${short.title.padEnd(30)}(변경 없음)`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log(`✅ ${updated}개 제목 원본으로 되돌림`)
}

main().catch(console.error)
