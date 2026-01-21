import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

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
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    // 기본 폴더: rg-family 프로젝트 전용
    const subfolder = (formData.get('folder') as string) || 'general'
    const folder = `rg-family/${subfolder}`

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다' },
        { status: 400 }
      )
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '이미지 파일만 업로드 가능합니다' },
        { status: 400 }
      )
    }

    // 파일 크기 검증 (10MB - Cloudinary 무료 플랜 제한)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `파일 크기는 10MB 이하여야 합니다 (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      )
    }

    // File을 Buffer로 변환
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // GIF 여부 확인
    const isGif = file.type === 'image/gif'

    // Cloudinary에 업로드
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          // GIF는 애니메이션 유지, 일반 이미지는 최적화
          ...(isGif
            ? {
                // GIF: 애니메이션 유지하면서 리사이즈
                transformation: [
                  { width: 400, height: 400, crop: 'fill' }
                ]
              }
            : {
                // 일반 이미지: 최적화 적용
                transformation: [
                  { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                  { quality: 'auto', fetch_format: 'auto' }
                ]
              })
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result as { secure_url: string; public_id: string })
        }
      ).end(buffer)
    })

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    console.error('Upload error:', error)
    const err = error as { message?: string; http_code?: number }

    // Cloudinary 에러 메시지 처리
    if (err.message?.includes('File size too large')) {
      return NextResponse.json(
        { error: '파일 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
