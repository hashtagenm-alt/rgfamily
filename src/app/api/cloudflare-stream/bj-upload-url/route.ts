import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } from '@/lib/cloudflare'

/**
 * BJ 멤버 및 관리자용 영상 업로드 URL 발급 API
 * - BJ 멤버: 감사 메시지 영상 업로드 용도
 * - 관리자: 대리 업로드 용도
 * - 200MB 이상 파일은 TUS 프로토콜 사용
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
    const { title, fileSize } = body as { title?: string; fileSize?: number }

    // 200MB 이상이면 TUS 프로토콜 사용
    const useTus = fileSize && fileSize > 200 * 1024 * 1024

    if (useTus) {
      // TUS 업로드용 URL 발급 (Cloudflare Stream TUS endpoint)
      const tusEndpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`

      return NextResponse.json({
        uploadURL: tusEndpoint,
        useTus: true,
        // TUS 요청에 필요한 헤더 정보
        tusHeaders: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Tus-Resumable': '1.0.0',
        },
        maxDurationSeconds: 600,
        meta: title ? { name: title, source: 'bj-message' } : { source: 'bj-message' },
      })
    }

    // 기본 직접 업로드 (200MB 미만)
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 600, // BJ 메시지 영상은 최대 10분
          meta: title ? { name: title, source: 'bj-message' } : { source: 'bj-message' },
        }),
      }
    )

    const json = await res.json()

    if (!json.success) {
      throw new Error(json.errors?.[0]?.message || 'Cloudflare Stream 업로드 URL 발급 실패')
    }

    return NextResponse.json({
      uploadURL: json.result.uploadURL,
      uid: json.result.uid,
      useTus: false,
    })
  } catch (error) {
    console.error('BJ video upload URL error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드 URL 발급 실패' },
      { status: 500 }
    )
  }
}
