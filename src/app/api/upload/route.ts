import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/utils/logger'

// App Router용 설정
export const maxDuration = 60
export const dynamic = 'force-dynamic'

// R2 클라이언트 설정
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'rg-family-images'
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''

// 인증 헬퍼 함수
async function getAuthenticatedUser() {
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
  return user
}

/**
 * GET: Presigned URL 발급 (큰 파일 직접 업로드용)
 * Query params: folder, filename, contentType
 */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: '서버 설정 오류: 이미지 업로드 서비스가 구성되지 않았습니다.' },
        { status: 500 }
      )
    }

    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || 'general'
    const filename = searchParams.get('filename') || 'image.jpg'
    const contentType = searchParams.get('contentType') || 'image/jpeg'

    // 이미지 파일만 허용
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다' }, { status: 400 })
    }

    const ext = filename.split('.').pop() || 'jpg'
    const key = `${folder}/${randomUUID()}.${ext}`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
    const publicUrl = `${R2_PUBLIC_URL}/${key}`

    return NextResponse.json({
      uploadUrl: presignedUrl,
      publicUrl,
      key,
    })
  } catch (error) {
    logger.apiError('/api/upload [GET]', error)
    return NextResponse.json(
      { error: '업로드 URL 발급에 실패했습니다' },
      { status: 500 }
    )
  }
}

/**
 * POST: 직접 업로드 (4MB 이하 파일용, 기존 방식)
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      logger.error('R2 configuration missing')
      return NextResponse.json(
        { error: '서버 설정 오류: 이미지 업로드 서비스가 구성되지 않았습니다.' },
        { status: 500 }
      )
    }

    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const subfolder = (formData.get('folder') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${randomUUID()}.${ext}`
    const key = `${subfolder}/${filename}`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })

    await r2Client.send(command)

    const publicUrl = `${R2_PUBLIC_URL}/${key}`

    return NextResponse.json({
      url: publicUrl,
      key: key,
    })
  } catch (error) {
    logger.apiError('/api/upload [POST]', error)
    const err = error as { message?: string; code?: string }

    return NextResponse.json(
      { error: err.message || '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
