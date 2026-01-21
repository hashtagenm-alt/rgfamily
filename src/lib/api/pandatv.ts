/**
 * PandaTV 라이브 상태 확인 API 클라이언트
 *
 * PandaTV API를 사용하여 라이브 상태를 확인
 * - API: https://api.pandalive.co.kr/v1/live
 * - 채널 URL: https://www.pandalive.co.kr/channel/[channel_id]
 */

export interface PandaTVLiveStatus {
  channelId: string
  isLive: boolean
  title?: string
  viewerCount?: number
  thumbnailUrl?: string
  userNick?: string
  error?: string
}

interface PandaTVAPILiveItem {
  userId: string
  userNick: string
  title: string
  user: number // viewer count
  thumbUrl: string
  isLive: boolean
  startTime: string
  category: string
}

interface PandaTVAPIResponse {
  list: PandaTVAPILiveItem[]
}

// 캐시 (30초 TTL)
let liveListCache: { data: PandaTVAPILiveItem[]; timestamp: number } | null = null
const CACHE_TTL = 30 * 1000 // 30초

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
 * PandaTV API에서 현재 라이브 중인 BJ 목록 가져오기
 */
async function fetchLiveList(): Promise<PandaTVAPILiveItem[]> {
  // 캐시 확인
  if (liveListCache && Date.now() - liveListCache.timestamp < CACHE_TTL) {
    return liveListCache.data
  }

  try {
    const response = await fetch('https://api.pandalive.co.kr/v1/live', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`PandaTV API error: HTTP ${response.status}`)
      return liveListCache?.data || []
    }

    const data: PandaTVAPIResponse = await response.json()
    const list = data.list || []

    // 캐시 업데이트
    liveListCache = { data: list, timestamp: Date.now() }

    return list
  } catch (error) {
    console.error('PandaTV API fetch error:', error)
    return liveListCache?.data || []
  }
}

/**
 * 단일 채널의 라이브 상태 확인
 *
 * @description
 * PandaTV API를 사용하여 라이브 상태를 확인합니다.
 * API는 현재 라이브 중인 모든 BJ 목록을 반환하므로,
 * 해당 채널이 목록에 있는지 확인합니다.
 */
export async function checkChannelLiveStatus(channelId: string): Promise<PandaTVLiveStatus> {
  try {
    const liveList = await fetchLiveList()

    // 채널 ID로 라이브 중인 BJ 찾기
    const liveBJ = liveList.find(
      (bj) => bj.userId.toLowerCase() === channelId.toLowerCase()
    )

    if (liveBJ) {
      return {
        channelId,
        isLive: true,
        title: liveBJ.title,
        viewerCount: liveBJ.user,
        thumbnailUrl: liveBJ.thumbUrl,
        userNick: liveBJ.userNick,
      }
    }

    // 라이브 중이 아닌 경우
    return {
      channelId,
      isLive: false,
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
 * 여러 채널의 라이브 상태를 동시에 확인
 * API 호출 1번으로 모든 채널 상태 확인 가능
 *
 * @param channelIds 확인할 채널 ID 배열
 * @param _concurrency (미사용) 기존 코드 호환성을 위해 유지. API 방식은 단일 호출로 처리함
 */
export async function checkMultipleChannels(
  channelIds: string[],
  _concurrency?: number
): Promise<PandaTVLiveStatus[]> {
  try {
    const liveList = await fetchLiveList()

    // 라이브 중인 BJ를 Map으로 변환 (빠른 검색을 위해)
    const liveMap = new Map<string, PandaTVAPILiveItem>()
    for (const bj of liveList) {
      liveMap.set(bj.userId.toLowerCase(), bj)
    }

    // 각 채널 상태 확인
    return channelIds.map((channelId) => {
      const liveBJ = liveMap.get(channelId.toLowerCase())

      if (liveBJ) {
        return {
          channelId,
          isLive: true,
          title: liveBJ.title,
          viewerCount: liveBJ.user,
          thumbnailUrl: liveBJ.thumbUrl,
          userNick: liveBJ.userNick,
        }
      }

      return {
        channelId,
        isLive: false,
      }
    })
  } catch (error) {
    // 에러 시 모두 오프라인으로 처리
    return channelIds.map((channelId) => ({
      channelId,
      isLive: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }))
  }
}

/**
 * 현재 라이브 중인 모든 BJ 목록 가져오기
 */
export async function getAllLiveBJs(): Promise<PandaTVLiveStatus[]> {
  try {
    const liveList = await fetchLiveList()

    return liveList.map((bj) => ({
      channelId: bj.userId,
      isLive: true,
      title: bj.title,
      viewerCount: bj.user,
      thumbnailUrl: bj.thumbUrl,
      userNick: bj.userNick,
    }))
  } catch (error) {
    console.error('getAllLiveBJs error:', error)
    return []
  }
}
