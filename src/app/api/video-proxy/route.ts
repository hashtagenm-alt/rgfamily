import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

/**
 * Video Proxy API
 * Chrome의 URL 안전 검사를 우회하기 위해 Supabase Storage 비디오를 프록시
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
  }

  // Supabase Storage URL만 허용 (hostname 검증)
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('.supabase.co') || !parsed.pathname.includes('/storage/')) {
      return NextResponse.json({ error: 'Invalid video URL' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch video: ${response.status}` },
        { status: response.status }
      )
    }

    const headers = new Headers()
    headers.set('Content-Type', response.headers.get('Content-Type') || 'video/mp4')
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'public, max-age=3600')

    // Range 요청 처리 (비디오 시크 지원)
    const rangeHeader = request.headers.get('range')
    if (rangeHeader && response.headers.get('Content-Length')) {
      const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10)
      const [start, end] = rangeHeader.replace('bytes=', '').split('-').map(Number)
      const actualEnd = end || contentLength - 1

      headers.set('Content-Range', `bytes ${start}-${actualEnd}/${contentLength}`)
      headers.set('Content-Length', String(actualEnd - start + 1))

      // Partial content를 위해 다시 fetch
      const rangeResponse = await fetch(url, {
        headers: { Range: rangeHeader },
      })

      return new NextResponse(rangeResponse.body, {
        status: 206,
        headers,
      })
    }

    // Content-Length 전달
    const contentLength = response.headers.get('Content-Length')
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    logger.apiError('/api/video-proxy', error)
    return NextResponse.json({ error: 'Failed to proxy video' }, { status: 500 })
  }
}
