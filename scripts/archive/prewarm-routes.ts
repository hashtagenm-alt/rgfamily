/**
 * 개발 서버 라우트 프리워밍 스크립트
 *
 * 주요 페이지를 미리 요청해서 Turbopack 컴파일 캐시를 생성
 * 페이지 전환 시 컴파일 대기 시간 제거
 */

const ROUTES_TO_PREWARM = [
  '/',
  '/ranking',
  '/ranking/season',
  '/ranking/vip',
  '/community',
  '/community/free',
  '/community/vip',
  '/notice',
  '/login',
  '/admin',
  '/admin/donations',
  '/admin/banners',
  '/admin/organization',
  '/admin/seasons',
  '/rg/org',
  '/rg/sig',
  '/rg/history',
  '/rg/live',
]

const BASE_URL = process.env.PREWARM_URL || 'http://localhost:3000'
const CONCURRENCY = 3 // 동시 요청 수
const DELAY_BETWEEN_BATCHES = 500 // 배치 간 딜레이 (ms)

async function fetchRoute(route: string): Promise<{ route: string; success: boolean; time: number }> {
  const start = Date.now()
  try {
    const response = await fetch(`${BASE_URL}${route}`, {
      headers: { 'User-Agent': 'Prewarm-Script' },
    })
    const time = Date.now() - start
    return { route, success: response.ok, time }
  } catch {
    return { route, success: false, time: Date.now() - start }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function prewarmRoutes(): Promise<void> {
  console.log('\x1b[36m[Prewarm]\x1b[0m 라우트 프리워밍 시작...')
  console.log(`\x1b[36m[Prewarm]\x1b[0m 대상: ${ROUTES_TO_PREWARM.length}개 라우트`)
  console.log('')

  const results: { route: string; success: boolean; time: number }[] = []

  // 배치로 나누어 요청
  for (let i = 0; i < ROUTES_TO_PREWARM.length; i += CONCURRENCY) {
    const batch = ROUTES_TO_PREWARM.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(fetchRoute))
    results.push(...batchResults)

    // 진행 상황 출력
    batchResults.forEach(r => {
      const status = r.success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
      const timeColor = r.time < 500 ? '\x1b[32m' : r.time < 2000 ? '\x1b[33m' : '\x1b[31m'
      console.log(`  ${status} ${r.route.padEnd(25)} ${timeColor}${r.time}ms\x1b[0m`)
    })

    // 배치 간 딜레이
    if (i + CONCURRENCY < ROUTES_TO_PREWARM.length) {
      await sleep(DELAY_BETWEEN_BATCHES)
    }
  }

  // 요약
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const avgTime = Math.round(results.reduce((sum, r) => sum + r.time, 0) / results.length)

  console.log('')
  console.log('\x1b[36m[Prewarm]\x1b[0m 프리워밍 완료')
  console.log(`  ✓ 성공: ${successful}개`)
  if (failed > 0) {
    console.log(`  ✗ 실패: ${failed}개`)
  }
  console.log(`  평균 시간: ${avgTime}ms`)
  console.log('')
}

// 서버가 준비될 때까지 대기
async function waitForServer(maxAttempts = 30): Promise<boolean> {
  console.log('\x1b[36m[Prewarm]\x1b[0m 개발 서버 대기 중...')

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(BASE_URL, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Prewarm-Script' },
      })
      if (response.ok || response.status === 200) {
        console.log('\x1b[36m[Prewarm]\x1b[0m 서버 준비 완료!')
        return true
      }
    } catch {
      // 서버 아직 준비 안됨
    }
    await sleep(1000)
    process.stdout.write('.')
  }

  console.log('')
  console.log('\x1b[31m[Prewarm]\x1b[0m 서버 연결 실패')
  return false
}

async function main(): Promise<void> {
  const serverReady = await waitForServer()
  if (!serverReady) {
    process.exit(1)
  }

  await prewarmRoutes()
}

main().catch(console.error)
