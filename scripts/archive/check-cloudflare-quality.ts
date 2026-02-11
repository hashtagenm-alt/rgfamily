/**
 * Cloudflare Stream 영상 품질 확인
 * 4K 원본 화질이 유지되는지 확인
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()

interface CloudflareVideoDetails {
  uid: string
  status: {
    state: string
  }
  input?: {
    width: number
    height: number
  }
  playback?: {
    hls: string
    dash: string
  }
  meta?: {
    name: string
  }
}

async function getVideoDetails(uid: string): Promise<CloudflareVideoDetails | null> {
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
      return data.result
    }
    return null
  } catch (err) {
    return null
  }
}

async function main() {
  console.log('=== Cloudflare Stream 영상 품질 확인 ===\n')

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    return
  }

  // DB에서 영상 UID 가져오기
  const { data: videos, error } = await supabase
    .from('signature_videos')
    .select(`
      id,
      cloudflare_uid,
      signatures(sig_number),
      organization(name)
    `)
    .not('cloudflare_uid', 'is', null)
    .order('id', { ascending: false })
    .limit(10)

  if (error || !videos) {
    console.error('DB 조회 실패:', error?.message)
    return
  }

  console.log(`최근 ${videos.length}개 영상 품질 확인:\n`)

  const resolutionStats: Record<string, number> = {}

  for (const video of videos) {
    const sig = (video.signatures as { sig_number: number } | null)?.sig_number
    const member = (video.organization as { name: string } | null)?.name
    const uid = video.cloudflare_uid

    process.stdout.write(`sig${sig} / ${member}: `)

    const details = await getVideoDetails(uid)

    if (!details) {
      console.log('❌ 조회 실패')
      continue
    }

    const width = details.input?.width || 0
    const height = details.input?.height || 0
    const state = details.status?.state || 'unknown'

    let quality = 'Unknown'
    if (height >= 2160) quality = '4K (2160p)'
    else if (height >= 1440) quality = 'QHD (1440p)'
    else if (height >= 1080) quality = 'FHD (1080p)'
    else if (height >= 720) quality = 'HD (720p)'
    else if (height > 0) quality = `${height}p`

    resolutionStats[quality] = (resolutionStats[quality] || 0) + 1

    const is4K = height >= 2160
    const icon = is4K ? '✅' : '⚠️'
    console.log(`${icon} ${width}x${height} (${quality}) [${state}]`)
  }

  console.log('\n=== 품질 통계 ===')
  Object.entries(resolutionStats).forEach(([quality, count]) => {
    console.log(`${quality}: ${count}개`)
  })

  const has4K = resolutionStats['4K (2160p)'] > 0
  if (!has4K) {
    console.log('\n⚠️ 4K 영상이 없습니다. 원본 4K 파일 재업로드가 필요할 수 있습니다.')
  }
}

main().catch(console.error)
