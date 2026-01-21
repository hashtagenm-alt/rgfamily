/**
 * PandaTV 라이브 상태 확인 API 클라이언트
 *
 * PandaTV는 공식 API가 없으므로 채널 페이지를 fetch하여 라이브 상태를 파싱
 * - 채널 URL: https://www.pandalive.co.kr/channel/[channel_id]
 * - 라이브 상태는 HTML 응답 내 특정 패턴으로 확인
 */

export interface PandaTVLiveStatus {
  channelId: string
  isLive: boolean
  title?: string
  viewerCount?: number
  thumbnailUrl?: string
  error?: string
}

/**
 * PandaTV 채널 URL에서 채널 ID 추출
 * @example "https://www.pandalive.co.kr/channel/rina" -> "rina"
 */
export function extractChannelId(url: string): string | null {
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
 * 단일 채널의 라이브 상태 확인
 *
 * @description
 * PandaTV 채널 페이지를 fetch하여 라이브 상태를 파싱합니다.
 * 라이브 중인 경우 HTML에 특정 메타 태그나 스크립트가 포함됩니다.
 */
export async function checkChannelLiveStatus(channelId: string): Promise<PandaTVLiveStatus> {
  const url = `https://www.pandalive.co.kr/channel/${channelId}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      next: { revalidate: 60 }, // 1분 캐시
    })

    if (!response.ok) {
      return {
        channelId,
        isLive: false,
        error: `HTTP ${response.status}`,
      }
    }

    const html = await response.text()

    // 라이브 상태 확인 패턴들
    // PandaTV는 라이브 중일 때 특정 클래스나 데이터 속성을 사용
    const isLive = checkIsLive(html)
    const title = extractTitle(html)
    const viewerCount = extractViewerCount(html)
    const thumbnailUrl = extractThumbnail(html, channelId)

    return {
      channelId,
      isLive,
      title,
      viewerCount,
      thumbnailUrl,
    }
  } catch (error) {
    return {
      channelId,
      isLive: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * HTML에서 라이브 상태 확인
 */
function checkIsLive(html: string): boolean {
  // PandaTV 라이브 상태 확인 패턴들
  const livePatterns = [
    /class="[^"]*live[^"]*on[^"]*"/i,
    /class="[^"]*is[-_]?live[^"]*"/i,
    /"isLive"\s*:\s*true/i,
    /"live"\s*:\s*true/i,
    /data-live="true"/i,
    /status["']?\s*:\s*["']?live/i,
    /broadcasting/i,
    /<meta[^>]+property="og:type"[^>]+content="video\.live"/i,
    /liveInfo/i,
    /player.*live/i,
  ]

  // 오프라인 패턴 (이 패턴이 있으면 오프라인)
  const offlinePatterns = [
    /class="[^"]*offline[^"]*"/i,
    /"isLive"\s*:\s*false/i,
    /방송 예정/i,
    /방송이 종료/i,
  ]

  // 오프라인 패턴이 있으면 false
  for (const pattern of offlinePatterns) {
    if (pattern.test(html)) {
      return false
    }
  }

  // 라이브 패턴이 있으면 true
  for (const pattern of livePatterns) {
    if (pattern.test(html)) {
      return true
    }
  }

  return false
}

/**
 * HTML에서 방송 제목 추출
 */
function extractTitle(html: string): string | undefined {
  // og:title 메타 태그
  const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
  if (ogTitleMatch) {
    return ogTitleMatch[1]
  }

  // title 태그
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  if (titleMatch) {
    return titleMatch[1].replace(/ - PandaTV.*$/i, '').trim()
  }

  return undefined
}

/**
 * HTML에서 시청자 수 추출
 */
function extractViewerCount(html: string): number | undefined {
  // JSON 데이터에서 시청자 수 찾기
  const viewerPatterns = [
    /"viewer(?:Count|s)?"\s*:\s*(\d+)/i,
    /"watchCount"\s*:\s*(\d+)/i,
    /"concurrent(?:Viewers)?"\s*:\s*(\d+)/i,
    /시청자\s*:?\s*(\d+)/,
    /(\d+)\s*명\s*시청/,
  ]

  for (const pattern of viewerPatterns) {
    const match = html.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return undefined
}

/**
 * HTML에서 썸네일 URL 추출
 */
function extractThumbnail(html: string, channelId: string): string | undefined {
  // og:image 메타 태그
  const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
  if (ogImageMatch) {
    return ogImageMatch[1]
  }

  // 썸네일 JSON 데이터
  const thumbPatterns = [
    /"thumbnail(?:Url)?"\s*:\s*"([^"]+)"/i,
    /"preview(?:Image)?"\s*:\s*"([^"]+)"/i,
  ]

  for (const pattern of thumbPatterns) {
    const match = html.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return undefined
}

/**
 * 여러 채널의 라이브 상태를 동시에 확인
 * Rate limiting을 위해 동시 요청 수 제한
 */
export async function checkMultipleChannels(
  channelIds: string[],
  concurrency: number = 3
): Promise<PandaTVLiveStatus[]> {
  const results: PandaTVLiveStatus[] = []

  // 청크로 나눠서 동시 요청 제한
  for (let i = 0; i < channelIds.length; i += concurrency) {
    const chunk = channelIds.slice(i, i + concurrency)
    const chunkResults = await Promise.all(
      chunk.map((channelId) => checkChannelLiveStatus(channelId))
    )
    results.push(...chunkResults)

    // 다음 청크 전 약간의 딜레이
    if (i + concurrency < channelIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return results
}
