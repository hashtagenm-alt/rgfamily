import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service Role Key로 Admin 클라이언트 생성 (이메일 인증 우회 가능)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, nickname } = await request.json()

    // 유효성 검사
    if (!email || !password || !nickname) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 6자 이상이어야 합니다' },
        { status: 400 }
      )
    }

    // Admin API로 사용자 생성 (이메일 인증 우회)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 자동 인증
      user_metadata: { nickname },
    })

    if (authError) {
      console.error('Auth error:', authError)

      if (authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: '이미 등록된 이메일입니다' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // 프로필 생성/업데이트
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: email,
          nickname: nickname,
          role: 'member',
        })

      if (profileError) {
        console.error('Profile error:', profileError)
      }
    }

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다',
      user: authData.user,
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
