/**
 * 라이브 상태 API 테스트 스크립트
 *
 * 사용법:
 *   npx tsx scripts/test-live-status.ts [채널ID]    - 단일 채널 확인 (통합/Fallback)
 *   npx tsx scripts/test-live-status.ts --all       - RG 전체 멤버 확인 (통합/Fallback)
 *   npx tsx scripts/test-live-status.ts --live      - 전체 라이브 목록 (통합/Fallback)
 *   npx tsx scripts/test-live-status.ts --api       - API만 테스트
 *   npx tsx scripts/test-live-status.ts --scraper   - 스크래퍼만 테스트
 *   npx tsx scripts/test-live-status.ts --compare   - API vs 스크래퍼 비교
 */

// 통합 모듈 (Fallback 적용)
import * as unified from '../src/lib/api/pandatv-unified'
// 개별 모듈 (테스트용)
import * as api from '../src/lib/api/pandatv'
import * as scraper from '../src/lib/api/pandatv-scraper'

// RG Family 멤버 채널 ID 목록
const RG_MEMBERS = [
  { name: '가애', channelId: 'acron5' },
  { name: '린아', channelId: 'qwerdf1101' },
  { name: '월아', channelId: 'goldmoon04' },
  { name: '채은', channelId: 'hj042300' },
  { name: '가윤', channelId: 'juuni9613' },
  { name: '설윤', channelId: 'xxchosun' },
  { name: '한세아', channelId: 'kkrinaa' },
  { name: '청아', channelId: 'mandoooo' },
  { name: '손밍', channelId: 'sm5252' },
  { name: '해린', channelId: 'qwerty3490' },
  { name: '키키', channelId: 'kiki0213' },
  { name: '한백설', channelId: 'firstaplus121' },
  { name: '홍서하', channelId: 'lrsehwa' },
  { name: '퀸로니', channelId: 'tjdrks1771' },
]

async function testSingle() {
  const channelId = process.argv[2] || 'tjdrks1771'

  console.log(`채널 '${channelId}' 라이브 상태 확인 중... (통합/Fallback)`)
  console.log(`URL: https://www.pandalive.co.kr/channel/${channelId}`)
  console.log('')

  const status = await unified.checkChannelLiveStatus(channelId)

  console.log('=== 결과 ===')
  console.log('채널 ID:', status.channelId)
  console.log('라이브 여부:', status.isLive ? '🔴 라이브 중' : '⚫ 오프라인')
  console.log('데이터 소스:', status.source === 'api' ? '📡 API' : '🔍 스크래퍼')
  if (status.userNick) console.log('닉네임:', status.userNick)
  if (status.title) console.log('방송 제목:', status.title)
  if (status.viewerCount !== undefined) console.log('시청자 수:', status.viewerCount)
  if (status.thumbnailUrl) console.log('썸네일:', status.thumbnailUrl)
  if (status.error) console.log('에러:', status.error)
}

async function testAllMembers() {
  console.log('=== RG Family 멤버 라이브 상태 확인 (통합/Fallback) ===\n')

  const channelIds = RG_MEMBERS.map((m) => m.channelId)
  const results = await unified.checkMultipleChannels(channelIds)

  let liveCount = 0
  const sources = new Set<string>()

  for (let i = 0; i < results.length; i++) {
    const member = RG_MEMBERS[i]
    const status = results[i]
    const liveIcon = status.isLive ? '🔴' : '⚫'
    const liveText = status.isLive ? '라이브 중' : '오프라인'
    if (status.source) sources.add(status.source)

    console.log(`${liveIcon} ${member.name} (${member.channelId}): ${liveText}`)
    if (status.isLive) {
      liveCount++
      console.log(`   제목: ${status.title}`)
      console.log(`   시청자: ${status.viewerCount}명`)
    }
  }

  console.log(`\n총 ${liveCount}명 라이브 중`)
  console.log(`데이터 소스: ${[...sources].map(s => s === 'api' ? '📡 API' : '🔍 스크래퍼').join(', ')}`)
}

async function testLiveList() {
  console.log('=== 현재 PandaTV 라이브 BJ 목록 (통합/Fallback) ===\n')

  const liveBJs = await unified.getAllLiveBJs()
  console.log(`총 ${liveBJs.length}명 라이브 중\n`)

  for (const bj of liveBJs.slice(0, 10)) {
    console.log(`🔴 ${bj.userNick} (${bj.channelId})`)
    console.log(`   제목: ${bj.title}`)
    console.log(`   시청자: ${bj.viewerCount}명`)
    console.log('')
  }

  if (liveBJs.length > 0) {
    console.log(`데이터 소스: ${liveBJs[0].source === 'api' ? '📡 API' : '🔍 스크래퍼'}`)
  }
}

async function testScraperMethod() {
  console.log('=== 스크래퍼 방식 테스트 (백업용) ===\n')
  console.log('주의: 스크래퍼 방식은 제한적입니다. API 방식을 권장합니다.\n')

  // 1. 단일 채널 테스트
  const testChannel = 'tjdrks1771'
  console.log(`[1] 단일 채널 스크래핑: ${testChannel}`)
  const singleResult = await scraper.checkChannelLiveStatusScraper(testChannel)
  console.log('   결과:', singleResult)
  console.log('')

  // 2. 라이브 목록 페이지 스크래핑
  console.log('[2] 라이브 목록 페이지 스크래핑 시도...')
  const liveList = await scraper.scrapeLiveListPage()
  if (liveList.length > 0) {
    console.log(`   ${liveList.length}명 발견`)
    for (const bj of liveList.slice(0, 5)) {
      console.log(`   - ${bj.userNick} (${bj.channelId})`)
    }
  } else {
    console.log('   라이브 목록을 가져오지 못했습니다.')
    console.log('   (JavaScript 렌더링이 필요할 수 있음)')
  }
  console.log('')

  console.log('스크래퍼 테스트 완료')
}

async function testApiOnly() {
  console.log('=== API 방식만 테스트 ===\n')

  const channelIds = RG_MEMBERS.map((m) => m.channelId)
  const results = await api.checkMultipleChannels(channelIds)

  let liveCount = 0
  for (let i = 0; i < results.length; i++) {
    const member = RG_MEMBERS[i]
    const status = results[i]
    const liveIcon = status.isLive ? '🔴' : '⚫'
    const liveText = status.isLive ? '라이브 중' : '오프라인'

    console.log(`${liveIcon} ${member.name} (${member.channelId}): ${liveText}`)
    if (status.isLive) {
      liveCount++
      console.log(`   제목: ${status.title}`)
      console.log(`   시청자: ${status.viewerCount}명`)
    }
    if (status.error) {
      console.log(`   ⚠️ 에러: ${status.error}`)
    }
  }

  console.log(`\n총 ${liveCount}명 라이브 중 (📡 API 직접 호출)`)
}

async function testCompare() {
  console.log('=== API vs 스크래퍼 비교 테스트 ===\n')

  const testChannel = 'tjdrks1771' // 퀸로니

  console.log(`테스트 채널: ${testChannel}`)
  console.log(`URL: https://www.pandalive.co.kr/channel/${testChannel}\n`)

  // API 방식
  console.log('[1] API 방식 테스트...')
  const startApi = Date.now()
  const apiResult = await api.checkChannelLiveStatus(testChannel)
  const apiTime = Date.now() - startApi
  console.log(`   결과: ${apiResult.isLive ? '🔴 라이브 중' : '⚫ 오프라인'}`)
  console.log(`   소요시간: ${apiTime}ms`)
  if (apiResult.error) console.log(`   에러: ${apiResult.error}`)
  console.log('')

  // 스크래퍼 방식
  console.log('[2] 스크래퍼 방식 테스트...')
  const startScraper = Date.now()
  const scraperResult = await scraper.checkChannelLiveStatusScraper(testChannel)
  const scraperTime = Date.now() - startScraper
  console.log(`   결과: ${scraperResult.isLive ? '🔴 라이브 중' : '⚫ 오프라인'}`)
  console.log(`   소요시간: ${scraperTime}ms`)
  if (scraperResult.error) console.log(`   에러: ${scraperResult.error}`)
  console.log('')

  // 통합 모듈 (Fallback)
  console.log('[3] 통합 모듈 테스트 (Fallback)...')
  unified.resetStatus() // 상태 초기화
  const startUnified = Date.now()
  const unifiedResult = await unified.checkChannelLiveStatus(testChannel)
  const unifiedTime = Date.now() - startUnified
  console.log(`   결과: ${unifiedResult.isLive ? '🔴 라이브 중' : '⚫ 오프라인'}`)
  console.log(`   소스: ${unifiedResult.source === 'api' ? '📡 API' : '🔍 스크래퍼'}`)
  console.log(`   소요시간: ${unifiedTime}ms`)
  console.log('')

  // 비교 요약
  console.log('=== 비교 요약 ===')
  console.log(`API:      ${apiResult.isLive ? '라이브' : '오프라인'} (${apiTime}ms)`)
  console.log(`스크래퍼: ${scraperResult.isLive ? '라이브' : '오프라인'} (${scraperTime}ms)`)
  console.log(`통합:     ${unifiedResult.isLive ? '라이브' : '오프라인'} via ${unifiedResult.source} (${unifiedTime}ms)`)

  // 현재 통합 모듈 상태
  const status = unified.getStatus()
  console.log(`\n통합 모듈 상태:`)
  console.log(`  마지막 성공: ${status.lastSuccessfulMethod}`)
  console.log(`  API 실패 횟수: ${status.apiFailCount}`)
  console.log(`  스크래퍼 실패 횟수: ${status.scraperFailCount}`)
}

// 실행
const command = process.argv[2]

if (command === '--all') {
  testAllMembers()
} else if (command === '--live') {
  testLiveList()
} else if (command === '--api') {
  testApiOnly()
} else if (command === '--scraper') {
  testScraperMethod()
} else if (command === '--compare') {
  testCompare()
} else if (command) {
  testSingle()
} else {
  console.log('사용법:')
  console.log('  npx tsx scripts/test-live-status.ts [채널ID]  - 단일 채널 확인 (통합)')
  console.log('  npx tsx scripts/test-live-status.ts --all     - RG 전체 멤버 확인 (통합)')
  console.log('  npx tsx scripts/test-live-status.ts --live    - 전체 라이브 목록 (통합)')
  console.log('  npx tsx scripts/test-live-status.ts --api     - API 방식만 테스트')
  console.log('  npx tsx scripts/test-live-status.ts --scraper - 스크래퍼 방식만 테스트')
  console.log('  npx tsx scripts/test-live-status.ts --compare - API vs 스크래퍼 비교')
  console.log('')
  testAllMembers()
}
