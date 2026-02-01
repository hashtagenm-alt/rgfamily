import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createDirectUpload } from '@/lib/cloudflare'

/**
 * BJ 멤버 및 관리자용 영상 업로드 URL 발급 API
 * - BJ 멤버: 감사 메시지 영상 업로드 용도
 * - 관리자: 대리 업로드 용도
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

    // 프로필 및 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // BJ 멤버 확인 (organization.profile_id가 auth user.id와 일치하는지)
    const { data: bjMember } = await supabase
      .from('organization')
      .select('id')
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .single()

    const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role)
    const isBjMember = !!bjMember

    if (!isAdmin && !isBjMember) {
      return NextResponse.json({ error: 'BJ 멤버 또는 관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { title } = body as { title?: string }

    // BJ 메시지 영상은 최대 10분(600초)으로 제한
    const result = await createDirectUpload({
      maxDurationSeconds: 600,
      meta: title ? { title, source: 'bj-message' } : { source: 'bj-message' },
    })

    return NextResponse.json({
      uploadURL: result.uploadURL,
      uid: result.uid,
    })
  } catch (error) {
    console.error('BJ video upload URL error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드 URL 발급 실패' },
      { status: 500 }
    )
  }
}
