import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createDirectUpload } from '@/lib/cloudflare'
import { logger } from '@/lib/utils/logger'

/**
 * VIP 사용자용 Cloudflare Stream 업로드 URL 발급
 * - VIP 역할 또는 VIP 랭킹(1-50위) 사용자만 사용 가능
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

    // VIP 권한 확인 (역할 또는 랭킹)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, nickname')
      .eq('id', user.id)
      .single()

    // VIP 역할 체크
    const VIP_ROLES = ['vip', 'moderator', 'admin', 'superadmin']
    const isVipByRole = profile?.role && VIP_ROLES.includes(profile.role)

    // 랭킹 기반 VIP 체크 (1-50위)
    let isVipByRank = false
    if (!isVipByRole && profile?.nickname) {
      const { data: ranking } = await supabase
        .from('total_donation_rankings')
        .select('rank')
        .eq('donor_name', profile.nickname)
        .single()

      isVipByRank = !!(ranking && ranking.rank >= 1 && ranking.rank <= 50)
    }

    if (!isVipByRole && !isVipByRank) {
      return NextResponse.json({ error: 'VIP 등급 이상만 영상을 업로드할 수 있습니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { title, maxDurationSeconds } = body as { title?: string; maxDurationSeconds?: number }

    const result = await createDirectUpload({
      maxDurationSeconds: maxDurationSeconds || 300, // VIP는 5분 제한 (관리자는 1시간)
      meta: {
        title: title || 'VIP Message Video',
        uploadedBy: user.id,
        type: 'vip-message',
      },
    })

    return NextResponse.json({
      uploadURL: result.uploadURL,
      uid: result.uid,
    })
  } catch (error) {
    logger.apiError('/api/vip/video-upload-url', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드 URL 발급 실패' },
      { status: 500 }
    )
  }
}
