/**
 * 라이브 상태 API 테스트 스크립트
 */

import { checkChannelLiveStatus } from '../src/lib/api/pandatv'

async function test() {
  const channelId = process.argv[2] || 'tjdrks1771'

  console.log(`채널 '${channelId}' 라이브 상태 확인 중...`)
  console.log(`URL: https://www.pandalive.co.kr/channel/${channelId}`)
  console.log('')

  const status = await checkChannelLiveStatus(channelId)

  console.log('=== 결과 ===')
  console.log('채널 ID:', status.channelId)
  console.log('라이브 여부:', status.isLive ? '🔴 라이브 중' : '⚫ 오프라인')
  if (status.title) console.log('방송 제목:', status.title)
  if (status.viewerCount) console.log('시청자 수:', status.viewerCount)
  if (status.thumbnailUrl) console.log('썸네일:', status.thumbnailUrl)
  if (status.error) console.log('에러:', status.error)
}

test()
