/**
 * 숏츠 메타데이터 업데이트
 * - 제목 형식 변경: "시그명 이름" → "직캠(이름) 시그명"
 * - 썸네일 시간 변경: 영상 중간 (30초)
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = getServiceClient()

// 제목 형식 변환: "시그명 이름" → "직캠(이름) 시그명"
function formatTitle(originalTitle: string): string {
  // 패턴 1: "시그명 이름" (예: "가애 시그 가애", "센세 가윤", "바디 해린")
  // 패턴 2: "시그명 (이름)" (예: "가애 시그 (가윤)", "무아 (세아)")

  const trimmed = originalTitle.trim()

  // 패턴 2: 괄호가 있는 경우 "시그명 (이름)"
  const bracketMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)$/)
  if (bracketMatch) {
    const sigName = bracketMatch[1].trim()
    const dancerName = bracketMatch[2].trim()
    return `직캠(${dancerName}) ${sigName}`
  }

  // 패턴 1: 마지막 단어가 이름 (예: "센세 가윤" → 직캠(가윤) 센세)
  const parts = trimmed.split(' ')
  if (parts.length >= 2) {
    const dancerName = parts[parts.length - 1]
    const sigName = parts.slice(0, -1).join(' ')
    return `직캠(${dancerName}) ${sigName}`
  }

  // 변환 불가능한 경우 원본 반환
  return originalTitle
}

// 썸네일 URL 생성 (영상 중간 시점)
function getThumbnailUrl(cloudflareUid: string, timeSeconds: number = 30): string {
  return `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg?time=${timeSeconds}s&width=640&height=360&fit=crop`
}

async function main() {
  console.log('=== 숏츠 메타데이터 업데이트 ===\n')

  // 1. 최근 업로드된 숏츠 조회
  const { data: shorts, error } = await supabase
    .from('media_content')
    .select('id, title, cloudflare_uid, thumbnail_url')
    .eq('content_type', 'shorts')
    .not('cloudflare_uid', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('조회 실패:', error.message)
    return
  }

  console.log(`숏츠 ${shorts.length}개 발견\n`)
  console.log('='.repeat(80))
  console.log('ID'.padEnd(6) + '원본 제목'.padEnd(30) + '→ 새 제목')
  console.log('-'.repeat(80))

  let updated = 0

  for (const short of shorts) {
    const originalTitle = short.title
    const newTitle = formatTitle(originalTitle)

    // 썸네일 URL (30초 시점으로 변경)
    const newThumbnailUrl = short.cloudflare_uid
      ? getThumbnailUrl(short.cloudflare_uid, 30)
      : short.thumbnail_url

    // 변경사항 있는 경우에만 업데이트
    const titleChanged = newTitle !== originalTitle
    const thumbnailChanged = newThumbnailUrl !== short.thumbnail_url

    if (titleChanged || thumbnailChanged) {
      const { error: updateError } = await supabase
        .from('media_content')
        .update({
          title: newTitle,
          thumbnail_url: newThumbnailUrl,
        })
        .eq('id', short.id)

      if (updateError) {
        console.log(`${String(short.id).padEnd(6)}❌ 업데이트 실패: ${updateError.message}`)
      } else {
        console.log(`${String(short.id).padEnd(6)}${originalTitle.slice(0, 28).padEnd(30)}→ ${newTitle}`)
        updated++
      }
    } else {
      console.log(`${String(short.id).padEnd(6)}${originalTitle.slice(0, 28).padEnd(30)}(변경 없음)`)
    }
  }

  console.log('='.repeat(80))
  console.log(`\n✅ ${updated}개 업데이트 완료`)
}

main().catch(console.error)
