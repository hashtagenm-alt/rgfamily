/**
 * PandaTV 라이브 상태 확인 - HTML 스크래핑 방식 (백업용)
 *
 * 주의: 이 방식은 백업용입니다. 메인은 pandatv.ts의 API 방식을 사용하세요.
 *
 * PandaTV 채널 페이지를 스크래핑하여 라이브 상태를 확인합니다.
 * - 채널 URL: https://www.pandalive.co.kr/channel/[channel_id]
 * - 라이브 목록: https://www.pandalive.co.kr/live
 *
 * 한계점:
 * - 채널 개별 페이지에서는 라이브 상태 표시가 없음
 * - 라이브 목록 페이지는 JavaScript 렌더링이 필요할 수 있음
 * - API 방식(pandatv.ts)이 더 안정적임
 */

export interface PandaTVLiveStatusScraper {
  channelId: string
  isLive: boolean
  title?: string
  viewerCount?: number
  thumbnailUrl?: string
  userNick?: string
  error?: string
}

/**
 * PandaTV 채널 URL에서 채널 ID 추출
 * @example "https://www.pandalive.co.kr/channel/rina" -> "rina"
 */
export function extractChannelIdScraper(url: string): string | null {
  try {
    const urlObj = new URL(url)
    if (!urlObj.hostname.includes('pandalive.co.kr')) {
      return null
    }
    // /channel/xxx 또는 /xxx 형식 모두 지원
    const pathname = urlObj.pathname
    const match = pathname.match(/^\/(?:channel\/)?([^/]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * HTML에서 라이브 상태 파싱 시도 (백업용)
 *
 * 주의: 현재 PandaTV 채널 페이지에서는 라이브 상태 표시가
 * JavaScript로 동적 렌더링되어 서버사이드에서 파싱이 어려움
 */
async function fetchChannelPageHTML(channelId: string): Promise<string | null> {
  try {
    const url = `https://www.pandalive.co.kr/channel/${channelId}`
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`Scraper: HTTP ${response.status} for channel ${channelId}`)
      return null
    }

    return await response.text()
  } catch (error) {
    console.error(`Scraper: fetch error for channel ${channelId}:`, error)
    return null
  }
}

/**
 * HTML에서 라이브 상태 추출 시도
 *
 * 참고: 실제 라이브 상태는 JavaScript로 렌더링되므로
 * 이 방식은 제한적입니다. 헤드리스 브라우저(Puppeteer 등)가 필요할 수 있음
 */
function parseLiveStatusFromHTML(html: string, channelId: string): PandaTVLiveStatusScraper {
  // 라이브 상태 관련 패턴들 시도
  const livePatterns = [
    /"isLive"\s*:\s*true/i,
    /class="[^"]*live[^"]*"/i,
    /data-live="true"/i,
    /"broadcasting"\s*:\s*true/i,
  ]

  const isLive = livePatterns.some((pattern) => pattern.test(html))

  // 제목 추출 시도
  let title: string | undefined
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  if (titleMatch) {
    title = titleMatch[1].replace(/ - PandaTV.*$/i, '').trim()
  }

  // 닉네임 추출 시도 (메타 태그에서)
  let userNick: string | undefined
  const nickMatch = html.match(/content="([^"]+)"\s+property="og:title"/i)
  if (nickMatch) {
    userNick = nickMatch[1]
  }

  return {
    channelId,
    isLive,
    title,
    userNick,
  }
}

/**
 * 단일 채널의 라이브 상태 확인 (스크래핑 방식)
 *
 * @deprecated API 방식(pandatv.ts)을 사용하세요
 */
export async function checkChannelLiveStatusScraper(
  channelId: string
): Promise<PandaTVLiveStatusScraper> {
  try {
    const html = await fetchChannelPageHTML(channelId)

    if (!html) {
      return {
        channelId,
        isLive: false,
        error: 'Failed to fetch channel page',
      }
    }

    return parseLiveStatusFromHTML(html, channelId)
  } catch (error) {
    return {
      channelId,
      isLive: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 여러 채널의 라이브 상태를 순차적으로 확인 (스크래핑 방식)
 *
 * @deprecated API 방식(pandatv.ts)을 사용하세요
 */
export async function checkMultipleChannelsScraper(
  channelIds: string[]
): Promise<PandaTVLiveStatusScraper[]> {
  const results: PandaTVLiveStatusScraper[] = []

  // 순차 처리 (서버 부하 방지)
  for (const channelId of channelIds) {
    const status = await checkChannelLiveStatusScraper(channelId)
    results.push(status)
    // 요청 간 딜레이 (1초)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return results
}

/**
 * 라이브 목록 페이지 스크래핑 시도 (백업용)
 *
 * 참고: 실제 데이터는 JavaScript로 로드되므로
 * 서버사이드에서는 제한적. 헤드리스 브라우저가 필요할 수 있음
 */
export async function scrapeLiveListPage(): Promise<PandaTVLiveStatusScraper[]> {
  try {
    const response = await fetch('https://www.pandalive.co.kr/live', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`Scraper: HTTP ${response.status} for live list`)
      return []
    }

    const html = await response.text()

    // JSON 데이터가 페이지에 포함되어 있는지 확인
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[^;]+});/)
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1])
        // 데이터 구조에 따라 파싱
        if (data.live?.list) {
          return data.live.list.map((item: { userId: string; userNick: string; title: string; user: number; thumbUrl: string }) => ({
            channelId: item.userId,
            isLive: true,
            title: item.title,
            viewerCount: item.user,
            thumbnailUrl: item.thumbUrl,
            userNick: item.userNick,
          }))
        }
      } catch {
        console.error('Scraper: Failed to parse initial state JSON')
      }
    }

    return []
  } catch (error) {
    console.error('Scraper: live list page error:', error)
    return []
  }
}
