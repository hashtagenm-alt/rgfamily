import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getVideoStatus, deleteVideo } from '@/lib/cloudflare'

async function getAuthenticatedAdmin() {
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

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) return null

  return user
}

/** GET: 영상 처리 상태 조회 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { uid } = await params
    const video = await getVideoStatus(uid)

    return NextResponse.json({
      uid: video.uid,
      status: video.status,
      duration: video.duration,
      thumbnail: video.thumbnail,
      playback: video.playback,
    })
  } catch (error) {
    console.error('Cloudflare Stream status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '상태 조회 실패' },
      { status: 500 }
    )
  }
}

/** DELETE: 영상 삭제 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { uid } = await params
    await deleteVideo(uid)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cloudflare Stream delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '삭제 실패' },
      { status: 500 }
    )
  }
}
