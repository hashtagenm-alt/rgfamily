import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cloudinary 설정
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
}

cloudinary.config(cloudinaryConfig)

export async function POST(request: NextRequest) {
  try {
    // Cloudinary 설정 확인
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
      console.error('Cloudinary configuration missing:', {
        cloud_name: !!cloudinaryConfig.cloud_name,
        api_key: !!cloudinaryConfig.api_key,
        api_secret: !!cloudinaryConfig.api_secret,
      })
      return NextResponse.json(
        { error: '서버 설정 오류: 이미지 업로드 서비스가 구성되지 않았습니다.' },
        { status: 500 }
      )
    }

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

    // 폴더별 특수 처리
    const isBanner = subfolder === 'banners'
    const isAvatar = subfolder === 'avatars'
    // 인라인 에디터용 이미지 (notices, posts 등)
    const isInlineContent = ['notices', 'posts', 'community'].includes(subfolder)

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

    // 파일 크기 검증 (20MB - VIP 시그니처 이미지 고화질 지원)
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `파일 크기는 20MB 이하여야 합니다 (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)` },
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
      // 배너용 transformation (1500x350 크기)
      const bannerTransformation = [
        { width: 1500, height: 350, crop: 'fill', gravity: 'center' },
        { quality: 'auto:good', fetch_format: 'auto' }
      ]

      // 아바타용 transformation (800x800 고해상도)
      // GIF는 애니메이션 보존을 위해 fl_animated 플래그 사용
      const avatarTransformation = isGif
        ? [{ width: 800, height: 800, crop: 'fill', flags: 'animated' }]
        : [
            { width: 800, height: 800, crop: 'fill', gravity: 'face' },
            { quality: 'auto:best', fetch_format: 'auto' }
          ]

      // 인라인 에디터용 이미지 transformation (크기 제한만, 크롭 없음)
      const inlineTransformation = isGif
        ? [{ width: 1200, crop: 'limit', flags: 'animated' }]
        : [
            { width: 1200, crop: 'limit' },
            { quality: 'auto:good', fetch_format: 'auto' }
          ]

      // 일반 이미지 transformation (400x400 정사각형)
      const defaultTransformation = isGif
        ? [{ width: 400, height: 400, crop: 'fill', flags: 'animated' }]
        : [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]

      // 폴더별 transformation 선택
      const transformation = isBanner
        ? bannerTransformation
        : isAvatar
          ? avatarTransformation
          : isInlineContent
            ? inlineTransformation
            : defaultTransformation

      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation,
          // GIF 애니메이션 보존 설정
          ...(isGif && { format: 'gif' }),
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
    const err = error as { message?: string; http_code?: number; error?: { message?: string } }

    // Cloudinary 에러 메시지 처리
    if (err.message?.includes('File size too large')) {
      return NextResponse.json(
        { error: '파일 크기가 너무 큽니다. 20MB 이하의 이미지를 선택해주세요.' },
        { status: 400 }
      )
    }

    // Cloudinary API 에러
    if (err.error?.message) {
      console.error('Cloudinary error details:', err.error.message)
      return NextResponse.json(
        { error: `업로드 실패: ${err.error.message}` },
        { status: 500 }
      )
    }

    // 일반 에러 메시지
    const errorMessage = err.message || '업로드에 실패했습니다'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
