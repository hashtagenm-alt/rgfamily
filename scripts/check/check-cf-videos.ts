/**
 * Cloudflare Stream 영상 목록 분석 스크립트
 * 불필요한 영상 및 중복 영상을 찾아 삭제 후보를 제시합니다.
 */
import { getServiceClient } from '../lib/supabase'

const supabase = getServiceClient()
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

interface CfVideo {
  uid: string
  meta?: { name?: string }
  duration: number
  size: number
  created: string
  status: { state: string }
  readyToStream: boolean
}

async function fetchAllVideos(): Promise<CfVideo[]> {
  const all: CfVideo[] = []

  // Cloudflare Stream uses after= cursor pagination, not page=
  let after = ''
  while (true) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream?per_page=50${after ? '&after=' + after : ''}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    })
    const data = await res.json() as { success: boolean; result: CfVideo[]; range?: number; total?: number }
    if (!data.success || !data.result || data.result.length === 0) break
    all.push(...data.result)
    console.error(`  fetched ${all.length} videos...`)
    if (data.result.length < 50) break
    // Use last video's uid as cursor
    after = data.result[data.result.length - 1].uid
  }

  return all
}

async function main() {
  console.log('Cloudflare Stream 영상 분석')
  console.log('═'.repeat(60))

  // 1. Cloudflare에서 영상 목록 가져오기
  console.error('Cloudflare Stream 영상 목록 가져오는 중...')
  const videos = await fetchAllVideos()
  console.log(`\n총 영상 수: ${videos.length}`)

  // 2. DB의 media_content에서 사용 중인 uid 목록
  const { data: dbMedia } = await supabase
    .from('media_content')
    .select('cloudflare_uid, title, is_published')

  const dbUids = new Set((dbMedia || []).map(m => m.cloudflare_uid).filter(Boolean))
  const publishedUids = new Set(
    (dbMedia || []).filter(m => m.is_published).map(m => m.cloudflare_uid).filter(Boolean)
  )

  // 3. 정렬 및 분석
  const sorted = videos
    .map(v => ({
      uid: v.uid,
      name: v.meta?.name || '(이름 없음)',
      duration: v.duration || 0,
      minutes: Math.round((v.duration || 0) / 60 * 100) / 100,
      created: v.created?.substring(0, 10) || '',
      status: v.status?.state || '',
      readyToStream: v.readyToStream,
      inDb: dbUids.has(v.uid),
      published: publishedUids.has(v.uid),
    }))
    .sort((a, b) => b.duration - a.duration)

  // 상태별 통계
  let totalMinutes = 0
  const statusMap: Record<string, number> = {}
  for (const v of sorted) {
    totalMinutes += v.minutes
    const key = v.readyToStream ? v.status : `${v.status} (not ready)`
    statusMap[key] = (statusMap[key] || 0) + 1
  }
  console.log(`총 분 수: ${Math.round(totalMinutes)}분`)
  console.log(`상태: ${JSON.stringify(statusMap)}`)

  // 4. DB에 없는 영상 (Cloudflare에만 존재 = 삭제 1순위)
  const notInDb = sorted.filter(v => !v.inDb)
  const notInDbMinutes = Math.round(notInDb.reduce((s, v) => s + v.minutes, 0))
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`🗑️  DB에 없는 영상 (삭제 1순위): ${notInDb.length}개, ${notInDbMinutes}분`)
  console.log(`${'─'.repeat(60)}`)
  for (const v of notInDb) {
    const hrs = Math.floor(v.minutes / 60)
    const mins = Math.round(v.minutes % 60)
    console.log(`  ${hrs}h${mins}m | ${v.name} | ${v.created} | ${v.uid.substring(0, 16)}`)
  }

  // 5. 중복 이름
  const nameCounts: Record<string, typeof sorted> = {}
  for (const v of sorted) {
    if (!nameCounts[v.name]) nameCounts[v.name] = []
    nameCounts[v.name].push(v)
  }
  const duplicates = Object.entries(nameCounts).filter(([_, vids]) => vids.length > 1)
  if (duplicates.length > 0) {
    const dupMinutes = Math.round(
      duplicates.reduce((s, [_, vids]) => s + vids.slice(1).reduce((s2, v) => s2 + v.minutes, 0), 0)
    )
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`📋 중복 이름 영상: ${duplicates.length}그룹, 중복분 약 ${dupMinutes}분`)
    console.log(`${'─'.repeat(60)}`)
    for (const [name, vids] of duplicates.sort((a, b) => b[1][0].minutes - a[1][0].minutes)) {
      console.log(`  "${name}" (${vids.length}개, 각 ${vids[0].minutes}분)`)
      for (const v of vids) {
        const tag = v.inDb ? (v.published ? '📌DB+공개' : '📄DB') : '⚠️DB없음'
        console.log(`    ${v.uid.substring(0, 16)} | ${v.created} | ${tag}`)
      }
    }
  }

  // 6. 스트리밍 불가 영상
  const notReady = sorted.filter(v => !v.readyToStream && v.status !== 'inprogress')
  if (notReady.length > 0) {
    const nrMinutes = Math.round(notReady.reduce((s, v) => s + v.minutes, 0))
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`⚠️  스트리밍 불가 영상: ${notReady.length}개, ${nrMinutes}분`)
    console.log(`${'─'.repeat(60)}`)
    for (const v of notReady) {
      console.log(`  ${v.minutes}분 | ${v.name} | ${v.status} | ${v.uid.substring(0, 16)}`)
    }
  }

  // 7. DB에 있지만 비공개(is_published=false)인 긴 영상
  const unpublishedLong = sorted.filter(v => v.inDb && !v.published && v.minutes > 60)
  if (unpublishedLong.length > 0) {
    const upMinutes = Math.round(unpublishedLong.reduce((s, v) => s + v.minutes, 0))
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`🔒 DB에 있지만 비공개인 긴 영상(>1h): ${unpublishedLong.length}개, ${upMinutes}분`)
    console.log(`${'─'.repeat(60)}`)
    for (const v of unpublishedLong) {
      const hrs = Math.floor(v.minutes / 60)
      const mins = Math.round(v.minutes % 60)
      console.log(`  ${hrs}h${mins}m | ${v.name} | ${v.created} | ${v.uid.substring(0, 16)}`)
    }
  }

  // 요약
  console.log(`\n${'═'.repeat(60)}`)
  console.log('📊 삭제 후보 요약')
  console.log(`${'═'.repeat(60)}`)
  console.log(`  DB에 없는 영상:      ${notInDb.length}개, ${notInDbMinutes}분`)
  console.log(`  중복 영상(여분):      삭제 시 약 ${duplicates.length}그룹`)
  console.log(`  스트리밍 불가:        ${notReady.length}개`)
  console.log(`  현재 초과분:          ${Math.round(totalMinutes - 10000)}분`)
  console.log(`  Part 4 업로드 필요:   ~202분`)
  console.log(`  총 확보 필요:         ~${Math.round(totalMinutes - 10000 + 202)}분`)
}

main().catch(err => {
  console.error('오류:', err.message)
  process.exit(1)
})
