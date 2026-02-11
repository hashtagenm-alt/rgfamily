/**
 * /replay 페이지 영상 품질 확인 및 4K 아닌 영상 리스트
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()

async function getVideoDetails(uid: string): Promise<{ width: number; height: number } | null> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
      {
        headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
      }
    )
    const data = await response.json()
    if (data.success && data.result) {
      return {
        width: data.result.input?.width || 0,
        height: data.result.input?.height || 0
      }
    }
    return null
  } catch {
    return null
  }
}

function extractUidFromUrl(url: string): string | null {
  // https://iframe.videodelivery.net/{uid}
  const match = url.match(/videodelivery\.net\/([a-f0-9]+)/)
  return match ? match[1] : null
}

async function main() {
  console.log('=== /replay 페이지 영상 품질 확인 ===\n')

  const { data: media, error } = await supabase
    .from('media_content')
    .select('id, title, content_type, video_url')
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false })

  if (error || !media) {
    console.error('DB 오류:', error?.message)
    return
  }

  console.log(`총 ${media.length}개 영상\n`)

  const non4K: Array<{ id: number; title: string; type: string; resolution: string }> = []
  let count4K = 0

  for (const item of media) {
    const uid = extractUidFromUrl(item.video_url)
    if (!uid) {
      console.log(`❌ UID 추출 실패: ${item.title}`)
      continue
    }

    const details = await getVideoDetails(uid)
    const type = item.content_type === 'shorts' ? '📱숏츠' : '🎬VOD'

    if (!details) {
      console.log(`❌ ${type} ${item.title}: 조회 실패`)
      continue
    }

    const is4K = details.height >= 2160
    const resolution = `${details.width}x${details.height}`

    if (is4K) {
      console.log(`✅ ${type} ${item.title}: ${resolution}`)
      count4K++
    } else {
      console.log(`⚠️ ${type} ${item.title}: ${resolution}`)
      non4K.push({
        id: item.id,
        title: item.title,
        type: item.content_type,
        resolution
      })
    }

    await new Promise(r => setTimeout(r, 100))
  }

  console.log('\n=== 결과 요약 ===')
  console.log(`4K 영상: ${count4K}개`)
  console.log(`4K 미만: ${non4K.length}개`)

  if (non4K.length > 0) {
    console.log('\n=== 재업로드 필요 목록 ===')
    non4K.forEach(v => {
      console.log(`- [${v.type}] ${v.title} (${v.resolution})`)
    })
  }
}

main().catch(console.error)
