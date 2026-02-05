/**
 * Cloudflare Stream 공통 유틸리티
 *
 * 기능:
 * - 영상 업로드 (FormData / TUS 프로토콜 자동 선택)
 * - 영상 정보 조회
 * - 영상 삭제
 *
 * 사용법:
 *   import { uploadToCloudflare, getVideoInfo, deleteVideo } from './lib/cloudflare'
 *
 *   const uid = await uploadToCloudflare('/path/to/video.mp4', '영상 제목')
 *   const info = await getVideoInfo(uid)
 *   await deleteVideo(uid)
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// 환경변수 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export interface CloudflareConfig {
  accountId: string
  apiToken: string
}

export interface VideoInfo {
  uid: string
  status: {
    state: string
    pctComplete?: number
    errorReasonCode?: string
    errorReasonText?: string
  }
  playback?: {
    hls: string
    dash: string
  }
  thumbnail?: string
  duration?: number
  size?: number
  created?: string
  modified?: string
  meta?: {
    name?: string
    [key: string]: unknown
  }
}

export interface UploadResult {
  uid: string
  success: boolean
}

// 환경변수 검증
function getConfig(): CloudflareConfig {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    const missing: string[] = []
    if (!accountId) missing.push('CLOUDFLARE_ACCOUNT_ID')
    if (!apiToken) missing.push('CLOUDFLARE_API_TOKEN')
    throw new Error(`환경변수가 설정되지 않았습니다: ${missing.join(', ')}`)
  }

  return { accountId, apiToken }
}

// 200MB 기준 (바이트)
const TUS_THRESHOLD = 200 * 1024 * 1024

/**
 * Cloudflare Stream에 영상 업로드
 * - 200MB 이하: FormData 직접 업로드
 * - 200MB 초과: TUS 프로토콜 사용
 *
 * @param filePath 업로드할 파일 경로
 * @param title 영상 제목 (선택)
 * @returns Cloudflare Stream UID
 */
export async function uploadToCloudflare(
  filePath: string,
  title?: string
): Promise<string> {
  const stats = fs.statSync(filePath)
  const fileSize = stats.size

  if (fileSize > TUS_THRESHOLD) {
    return await uploadViaTus(filePath, title, fileSize)
  }

  return await uploadViaFormData(filePath, title)
}

/**
 * FormData를 사용한 직접 업로드 (200MB 이하)
 */
async function uploadViaFormData(filePath: string, title?: string): Promise<string> {
  const { accountId, apiToken } = getConfig()

  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])
  const fileName = title || path.basename(filePath)

  const formData = new FormData()
  formData.append('file', blob, fileName)

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formData,
    }
  )

  const data = await response.json() as {
    success: boolean
    result?: { uid: string }
    errors?: Array<{ message: string }>
  }

  if (!response.ok || !data.success) {
    const errorMsg = data.errors?.[0]?.message || JSON.stringify(data.errors)
    throw new Error(`Cloudflare 업로드 실패: ${errorMsg}`)
  }

  return data.result!.uid
}

/**
 * TUS 프로토콜을 사용한 청크 업로드 (200MB 초과)
 */
async function uploadViaTus(
  filePath: string,
  title?: string,
  fileSize?: number
): Promise<string> {
  const { accountId, apiToken } = getConfig()

  const actualSize = fileSize || fs.statSync(filePath).size
  const fileName = title || path.basename(filePath)

  // 1. TUS 세션 생성
  const createResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(actualSize),
        'Upload-Metadata': `name ${Buffer.from(fileName).toString('base64')}`,
      },
    }
  )

  if (createResponse.status !== 201) {
    const errText = await createResponse.text()
    throw new Error(`TUS 세션 생성 실패: HTTP ${createResponse.status} - ${errText}`)
  }

  const tusUrl = createResponse.headers.get('Location')
  const streamMediaId = createResponse.headers.get('stream-media-id')

  if (!tusUrl) throw new Error('TUS URL을 받지 못했습니다')

  const uid = streamMediaId || (tusUrl.match(/\/([a-f0-9]{32})\??/)?.[1] ?? '')

  // 2. 청크 단위 업로드 (5MB)
  const CHUNK_SIZE = 5 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  let offset = 0

  try {
    while (offset < actualSize) {
      const readSize = Math.min(CHUNK_SIZE, actualSize - offset)
      const buffer = Buffer.alloc(readSize)
      fs.readSync(fd, buffer, 0, readSize, offset)

      const patchResponse = await fetch(tusUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
          'Content-Length': String(readSize),
        },
        body: buffer,
      })

      if (patchResponse.status !== 204) {
        const errText = await patchResponse.text()
        throw new Error(`TUS 청크 업로드 실패: offset=${offset}, HTTP ${patchResponse.status} - ${errText}`)
      }

      const newOffset = patchResponse.headers.get('Upload-Offset')
      offset = newOffset ? parseInt(newOffset, 10) : offset + readSize

      // 진행률 출력 (선택적)
      const pct = Math.round((offset / actualSize) * 100)
      process.stdout.write(`\r      TUS 업로드: ${pct}%`)
    }
    process.stdout.write('\n')
  } finally {
    fs.closeSync(fd)
  }

  return uid
}

/**
 * 영상 정보 조회
 */
export async function getVideoInfo(uid: string): Promise<VideoInfo | null> {
  const { accountId, apiToken } = getConfig()

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  )

  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error(`영상 정보 조회 실패: HTTP ${response.status}`)
  }

  const data = await response.json() as {
    success: boolean
    result?: VideoInfo
  }

  return data.result || null
}

/**
 * 영상 삭제
 */
export async function deleteVideo(uid: string): Promise<boolean> {
  const { accountId, apiToken } = getConfig()

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  )

  return response.ok
}

/**
 * 영상 상태 확인 (인코딩 완료 대기)
 */
export async function waitForReady(
  uid: string,
  timeoutMs = 300000, // 5분
  pollIntervalMs = 5000 // 5초
): Promise<VideoInfo> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const info = await getVideoInfo(uid)

    if (!info) {
      throw new Error(`영상을 찾을 수 없습니다: ${uid}`)
    }

    if (info.status.state === 'ready') {
      return info
    }

    if (info.status.state === 'error') {
      throw new Error(`인코딩 실패: ${info.status.errorReasonText || info.status.errorReasonCode}`)
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`인코딩 타임아웃: ${uid}`)
}

/**
 * Cloudflare 대시보드 URL 반환
 */
export function getDashboardUrl(): string {
  const { accountId } = getConfig()
  return `https://dash.cloudflare.com/${accountId}/stream`
}

// CLI 테스트 지원
if (require.main === module) {
  async function test() {
    console.log('🔧 Cloudflare Stream 라이브러리 테스트\n')

    try {
      const config = getConfig()
      console.log('✅ 환경변수 로드 성공')
      console.log(`   Account ID: ${config.accountId.slice(0, 8)}...`)
      console.log(`   Dashboard: ${getDashboardUrl()}`)
    } catch (err) {
      console.error('❌ 환경변수 오류:', err instanceof Error ? err.message : err)
    }
  }

  test()
}
