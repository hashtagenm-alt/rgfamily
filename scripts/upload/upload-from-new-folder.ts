/**
 * Google Drive 새 폴더(13LqA3l6zcIWgjvOMpKzVls9plJKym9qy) → Cloudflare Stream 업로드
 *
 * 폴더 구조: 플랫 파일 (멤버별 하위폴더 없음)
 * 파일명 규칙: "{sig_number} {멤버명}.mp4"
 *
 * 사용법:
 *   npx tsx scripts/upload-from-new-folder.ts --dry-run   # 테스트
 *   npx tsx scripts/upload-from-new-folder.ts              # 실제 업로드
 */

import { getServiceClient } from '../lib/supabase'
import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const supabase = getServiceClient()
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!
const DEFAULT_FOLDER_ID = '13LqA3l6zcIWgjvOMpKzVls9plJKym9qy'
const TEMP_DIR = path.join(os.tmpdir(), 'rg-new-folder-upload')
const DRY_RUN = process.argv.includes('--dry-run')

// --folder-id 인자 파싱
function getFolderId(): string {
  const idx = process.argv.indexOf('--folder-id')
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]
  return DEFAULT_FOLDER_ID
}
const FOLDER_ID = getFolderId()

interface RcloneFile {
  Path: string
  Name: string
  Size: number
  MimeType: string
  IsDir: boolean
  ID: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function parseFileName(name: string): { sigNumber: number; memberName: string } | null {
  // "1090 가애.mp4" → { sigNumber: 1090, memberName: "가애" }
  // "1158 가윤 .mp4" → { sigNumber: 1158, memberName: "가윤" }
  const withoutExt = name.replace(/\.(mp4|mov|avi|mkv|webm)$/i, '').trim()
  const match = withoutExt.match(/^(\d+)\s+(.+)$/)
  if (!match) return null
  return {
    sigNumber: parseInt(match[1], 10),
    memberName: match[2].trim(),
  }
}

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const stats = fs.statSync(filePath)
  const fileSize = stats.size

  if (fileSize > 200 * 1024 * 1024) {
    return await uploadViaTus(filePath, fileSize)
  }

  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])
  const formData = new FormData()
  formData.append('file', blob, path.basename(filePath))

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
      body: formData,
    }
  )

  const data = await response.json()
  if (!response.ok || !data.success) {
    throw new Error(`Cloudflare 업로드 실패: ${data.errors?.[0]?.message || JSON.stringify(data.errors)}`)
  }
  return data.result.uid
}

async function uploadViaTus(filePath: string, fileSize: number): Promise<string> {
  const createResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': `name ${Buffer.from(path.basename(filePath)).toString('base64')}`,
      },
    }
  )

  if (createResponse.status !== 201) {
    const errText = await createResponse.text()
    throw new Error(`TUS 생성 실패: HTTP ${createResponse.status} - ${errText}`)
  }

  const tusUrl = createResponse.headers.get('Location')
  const streamMediaId = createResponse.headers.get('stream-media-id')
  if (!tusUrl) throw new Error('TUS URL을 받지 못했습니다')

  const uid = streamMediaId || (tusUrl.match(/\/([a-f0-9]{32})\??/)?.[1] ?? '')
  const CHUNK_SIZE = 5 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  let offset = 0

  try {
    while (offset < fileSize) {
      const readSize = Math.min(CHUNK_SIZE, fileSize - offset)
      const buffer = Buffer.alloc(readSize)
      fs.readSync(fd, buffer, 0, readSize, offset)

      const patchResponse = await fetch(tusUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/offset+octet-stream',
          'Upload-Offset': String(offset),
          'Tus-Resumable': '1.0.0',
        },
        body: buffer,
      })

      if (patchResponse.status !== 204) {
        throw new Error(`TUS 청크 업로드 실패: HTTP ${patchResponse.status}`)
      }

      offset += readSize
      const pct = ((offset / fileSize) * 100).toFixed(1)
      process.stdout.write(`\r   업로드: ${pct}% (${formatBytes(offset)} / ${formatBytes(fileSize)})`)
    }
  } finally {
    fs.closeSync(fd)
  }

  process.stdout.write('\n')
  return uid
}

async function main() {
  console.log('='.repeat(60))
  console.log('새 폴더 → Cloudflare Stream 업로드')
  console.log(`모드: ${DRY_RUN ? 'DRY RUN (테스트)' : '실제 업로드'}`)
  console.log('='.repeat(60))

  // 1. Google Drive 스캔
  console.log('\nGoogle Drive 스캔 중...')
  const output = execFileSync('rclone', [
    'lsjson', 'gdrive:', '--drive-root-folder-id', FOLDER_ID, '--no-modtime',
  ], { encoding: 'utf-8', timeout: 60000 })
  const files: RcloneFile[] = JSON.parse(output)
  const videoFiles = files.filter(f => !f.IsDir && f.Name.endsWith('.mp4'))
  console.log(`영상 파일: ${videoFiles.length}개`)

  // 2. DB 조회
  const { data: sigs } = await supabase.from('signatures').select('id, sig_number').order('sig_number')
  const { data: members } = await supabase.from('organization').select('id, name')
  const { data: existingVids } = await supabase.from('signature_videos').select('id, signature_id, member_id, cloudflare_uid')

  if (!sigs || !members) throw new Error('DB 조회 실패')

  const sigMap = new Map(sigs.map(s => [s.sig_number, s.id]))
  const memberMap = new Map(members.map(m => [m.name, m.id]))

  // 3. 태스크 생성
  interface Task {
    file: RcloneFile
    sigNumber: number
    memberName: string
    memberId: number
    signatureId: number
    existingVideoId?: number
  }

  const tasks: Task[] = []
  const errors: string[] = []

  for (const file of videoFiles) {
    const parsed = parseFileName(file.Name)
    if (!parsed) {
      errors.push(`파싱 실패: ${file.Name}`)
      continue
    }

    const signatureId = sigMap.get(parsed.sigNumber)
    if (!signatureId) {
      errors.push(`시그니처 없음: sig${parsed.sigNumber} (${file.Name})`)
      continue
    }

    const memberId = memberMap.get(parsed.memberName)
    if (!memberId) {
      errors.push(`멤버 없음: ${parsed.memberName} (${file.Name})`)
      continue
    }

    // 기존 레코드 확인
    const existing = existingVids?.find(v => v.signature_id === signatureId && v.member_id === memberId)

    tasks.push({
      file,
      sigNumber: parsed.sigNumber,
      memberName: parsed.memberName,
      memberId,
      signatureId,
      existingVideoId: existing?.id,
    })
  }

  // 4. 결과 출력
  console.log(`\n업로드 대상: ${tasks.length}개`)
  if (errors.length > 0) {
    console.log(`경고: ${errors.length}개`)
    errors.forEach(e => console.log(`  - ${e}`))
  }

  const totalSize = tasks.reduce((sum, t) => sum + t.file.Size, 0)
  console.log(`총 용량: ${formatBytes(totalSize)}`)

  console.log('\n목록:')
  for (const t of tasks) {
    const status = t.existingVideoId ? `업데이트 (ID:${t.existingVideoId})` : '신규'
    console.log(`  sig${t.sigNumber} ${t.memberName} (${formatBytes(t.file.Size)}) → ${status}`)
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] 여기서 종료합니다.')
    return
  }

  if (tasks.length === 0) {
    console.log('\n처리할 영상이 없습니다.')
    return
  }

  // 5. 실제 업로드
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

  let success = 0, failed = 0

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    console.log(`\n[${i + 1}/${tasks.length}] sig${t.sigNumber} ${t.memberName} (${formatBytes(t.file.Size)})`)

    const localPath = path.join(TEMP_DIR, t.file.Name)

    try {
      // 다운로드
      console.log('   다운로드 중...')
      execFileSync('rclone', [
        'copyto', `gdrive:${t.file.Path}`, localPath,
        '--drive-root-folder-id', FOLDER_ID, '--progress',
      ], { stdio: 'inherit', timeout: 600000 })

      // Cloudflare 업로드
      console.log('   Cloudflare 업로드 중...')
      const uid = await uploadToCloudflare(localPath, `sig${t.sigNumber}_${t.memberName}`)
      console.log(`   UID: ${uid}`)

      // DB 저장
      const videoUrl = `https://iframe.videodelivery.net/${uid}`
      if (t.existingVideoId) {
        const { error } = await supabase
          .from('signature_videos')
          .update({ cloudflare_uid: uid, video_url: videoUrl })
          .eq('id', t.existingVideoId)
        if (error) throw new Error(`DB 업데이트 실패: ${error.message}`)
        console.log(`   DB 업데이트 완료 (ID:${t.existingVideoId})`)
      } else {
        const { data, error } = await supabase
          .from('signature_videos')
          .insert({
            signature_id: t.signatureId,
            member_id: t.memberId,
            video_url: videoUrl,
            cloudflare_uid: uid,
          })
          .select()
          .single()
        if (error) throw new Error(`DB 삽입 실패: ${error.message}`)
        console.log(`   DB 신규 등록 (ID:${data.id})`)
      }

      success++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`   실패: ${msg}`)
      failed++
    } finally {
      if (fs.existsSync(localPath)) {
        try { fs.unlinkSync(localPath) } catch {}
      }
    }

    // 다음 파일 전 1초 대기
    if (i < tasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`결과: 성공 ${success}개, 실패 ${failed}개`)
  console.log('='.repeat(60))
}

main().catch(err => {
  console.error(`\n오류: ${err.message || err}`)
  process.exit(1)
})
