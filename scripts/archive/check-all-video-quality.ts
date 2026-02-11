/**
 * 전체 Cloudflare Stream 영상 품질 확인
 * 4K가 아닌 영상 찾기
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()

async function getVideoDetails(uid: string): Promise<{ width: number; height: number; state: string } | null> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    )

    const data = await response.json()
    if (data.success && data.result) {
      return {
        width: data.result.input?.width || 0,
        height: data.result.input?.height || 0,
        state: data.result.status?.state || 'unknown'
      }
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  console.log('=== 전체 영상 품질 확인 ===\n')

  // 전체 영상 조회
  const { data: videos, error } = await supabase
    .from('signature_videos')
    .select(`
      id,
      cloudflare_uid,
      signatures(sig_number),
      organization(name)
    `)
    .not('cloudflare_uid', 'is', null)
    .order('id', { ascending: true })

  if (error || !videos) {
    console.error('DB 조회 실패:', error?.message)
    return
  }

  console.log(`총 ${videos.length}개 영상 확인 중...\n`)

  const non4KVideos: Array<{ sig: number; member: string; width: number; height: number; uid: string }> = []
  const failedVideos: Array<{ sig: number; member: string; uid: string }> = []
  let count4K = 0
  let countOther = 0

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i]
    const sig = (video.signatures as { sig_number: number } | null)?.sig_number || 0
    const member = (video.organization as { name: string } | null)?.name || 'Unknown'
    const uid = video.cloudflare_uid

    process.stdout.write(`\r[${i + 1}/${videos.length}] 확인 중...`)

    const details = await getVideoDetails(uid)

    if (!details) {
      failedVideos.push({ sig, member, uid })
      continue
    }

    if (details.height >= 2160) {
      count4K++
    } else {
      countOther++
      non4KVideos.push({
        sig,
        member,
        width: details.width,
        height: details.height,
        uid
      })
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\r' + ' '.repeat(50))
  console.log('\n=== 결과 ===')
  console.log(`✅ 4K 영상: ${count4K}개`)
  console.log(`⚠️ 4K 미만: ${countOther}개`)
  console.log(`❌ 조회 실패: ${failedVideos.length}개`)

  if (non4KVideos.length > 0) {
    console.log('\n=== 4K 미만 영상 목록 (재업로드 필요) ===')
    non4KVideos.forEach(v => {
      console.log(`- sig${v.sig} / ${v.member}: ${v.width}x${v.height}`)
    })
  }

  if (failedVideos.length > 0) {
    console.log('\n=== 조회 실패 영상 (확인 필요) ===')
    failedVideos.forEach(v => {
      console.log(`- sig${v.sig} / ${v.member}: ${v.uid.substring(0, 12)}...`)
    })
  }
}

main().catch(console.error)
