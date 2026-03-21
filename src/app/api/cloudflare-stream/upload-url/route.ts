import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createDirectUpload } from '@/lib/cloudflare'
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
    const { title, maxDurationSeconds } = body as { title?: string; maxDurationSeconds?: number }

    const result = await createDirectUpload({
      maxDurationSeconds: maxDurationSeconds || 3600,
      meta: title ? { title } : {},
    })

    return NextResponse.json({
      uploadURL: result.uploadURL,
      uid: result.uid,
    })
  } catch (error) {
    logger.apiError('/api/cloudflare-stream/upload-url', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드 URL 발급 실패' },
      { status: 500 }
    )
  }
}
