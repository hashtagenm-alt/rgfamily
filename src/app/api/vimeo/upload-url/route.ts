import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/utils/logger'

interface VimeoUploadBody {
  title: string
  size: number
  description?: string
}

interface VimeoUploadResponse {
  uri: string
  upload: {
    approach: string
    upload_link: string
    size: number
  }
}

/**
 * Vimeo TUS 업로드 URL 발급 API
 * - POST /api/vimeo/upload-url
 * - 관리자(admin/superadmin)만 접근 가능
 * - Body: { title: string, size: number, description?: string }
 * - Returns: { uploadUrl: string, vimeoId: string }
 */
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
    const { title, size, description } = body as Partial<VimeoUploadBody>

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'title은 필수입니다' }, { status: 400 })
    }
    if (!size || typeof size !== 'number' || size <= 0) {
      return NextResponse.json({ error: 'size는 양수여야 합니다' }, { status: 400 })
    }

    const accessToken = process.env.VIMEO_ACCESS_TOKEN
    if (!accessToken) {
      logger.apiError('/api/vimeo/upload-url', new Error('VIMEO_ACCESS_TOKEN 환경변수 누락'))
      return NextResponse.json({ error: 'Vimeo 설정이 올바르지 않습니다' }, { status: 500 })
    }

    // Vimeo API: TUS 업로드 URL 발급
    const vimeoRes = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
      },
      body: JSON.stringify({
        upload: {
          approach: 'tus',
          size,
        },
        name: title.trim(),
        ...(description ? { description } : {}),
        privacy: {
          view: 'unlisted',
        },
      }),
    })

    if (!vimeoRes.ok) {
      const errText = await vimeoRes.text().catch(() => '알 수 없는 오류')
      logger.apiError('/api/vimeo/upload-url', new Error(`Vimeo API 오류 ${vimeoRes.status}: ${errText}`))
      return NextResponse.json(
        { error: 'Vimeo 업로드 URL 발급 실패' },
        { status: 502 }
      )
    }

    const vimeoData: VimeoUploadResponse = await vimeoRes.json()

    // vimeoId: uri는 "/videos/123456789" 형태
    const vimeoId = vimeoData.uri?.split('/').pop()
    const uploadUrl = vimeoData.upload?.upload_link

    if (!vimeoId || !uploadUrl) {
      logger.apiError('/api/vimeo/upload-url', new Error(`Vimeo 응답 파싱 실패: ${JSON.stringify(vimeoData)}`))
      return NextResponse.json({ error: 'Vimeo 응답 형식 오류' }, { status: 502 })
    }

    return NextResponse.json({ uploadUrl, vimeoId })
  } catch (error) {
    logger.apiError('/api/vimeo/upload-url', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드 URL 발급 실패' },
      { status: 500 }
    )
  }
}
