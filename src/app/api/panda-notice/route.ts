import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

// 10분 캐싱 (ISR)
export const revalidate = 600

export interface PandaNotice {
  idx: number
  contents: string
  insertDateTime: string
  imgMainSrc: string | null
  linkUrl: string
}

interface PandaNoticeApiResponse {
  result: boolean
  list: Array<{
    idx: number
    contents: string
    insertDateTime: string
    imgMainSrc?: string
    linkUrl?: string
  }>
  page: {
    currentPage: number
    perPage: number
    totalCount: number
    totalPage: number
  }
}

const PANDA_NOTICE_API = 'https://api.pandalive.co.kr/v1/bj_notice'
const USER_ID = 'rgfamily'

export async function GET() {
  try {
    const response = await fetch(`${PANDA_NOTICE_API}?userId=${USER_ID}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RGFamily/1.0',
      },
      next: { revalidate: 600 }, // Next.js fetch 캐싱
    })

    if (!response.ok) {
      logger.apiError('/api/panda-notice', `PandaLive API error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: 'Failed to fetch notices', notices: [] },
        { status: 502 }
      )
    }

    const data: PandaNoticeApiResponse = await response.json()

    if (!data.result || !data.list) {
      return NextResponse.json({ notices: [] })
    }

    // 최신 2개만 반환
    const notices: PandaNotice[] = data.list.slice(0, 2).map((item) => ({
      idx: item.idx,
      contents: item.contents,
      insertDateTime: item.insertDateTime,
      imgMainSrc: item.imgMainSrc || null,
      linkUrl: item.linkUrl || `https://www.pandalive.co.kr/${USER_ID}`,
    }))

    return NextResponse.json({
      notices,
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.apiError('/api/panda-notice', error)
    return NextResponse.json(
      { error: 'Internal server error', notices: [] },
      { status: 500 }
    )
  }
}
