import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } from '@/lib/cloudflare'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { uploadLength, filename } = body as { uploadLength: number; filename?: string }

    if (!uploadLength || uploadLength <= 0) {
      return NextResponse.json({ error: '파일 크기가 필요합니다' }, { status: 400 })
    }

    // TUS 업로드 초기화 요청을 Cloudflare에 전송
    const tusEndpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`

    const metadata: string[] = []
    if (filename) {
      metadata.push(`filename ${Buffer.from(filename).toString('base64')}`)
    }
    metadata.push(`maxDurationSeconds ${Buffer.from('21600').toString('base64')}`) // 6시간

    const tusRes = await fetch(tusEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(uploadLength),
        'Upload-Metadata': metadata.join(','),
      },
    })

    if (!tusRes.ok) {
      const errorText = await tusRes.text()
      logger.apiError('/api/cloudflare-stream/tus-upload', `Cloudflare TUS init error: ${tusRes.status} ${errorText}`)

      // Cloudflare 에러 상세를 파싱하여 클라이언트에 전달
      let detail = ''
      try {
        const parsed = JSON.parse(errorText)
        detail = parsed.errors?.[0]?.message || parsed.messages?.[0]?.message || ''
      } catch {
        detail = errorText.slice(0, 200)
      }

      return NextResponse.json(
        { error: `TUS 업로드 초기화 실패${detail ? `: ${detail}` : ''} (HTTP ${tusRes.status})` },
        { status: 500 }
      )
    }

    // TUS 응답에서 Location과 stream-media-id 추출
    const location = tusRes.headers.get('location')
    const streamMediaId = tusRes.headers.get('stream-media-id')

    if (!location) {
      return NextResponse.json(
        { error: 'TUS 업로드 URL을 받지 못했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      uploadURL: location,
      uid: streamMediaId || location.split('/').pop(),
    })
  } catch (error) {
    logger.apiError('/api/cloudflare-stream/tus-upload', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TUS 업로드 초기화 실패' },
      { status: 500 }
    )
  }
}
