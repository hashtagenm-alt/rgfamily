/**
 * Google Drive -> Cloudflare Stream -> DB 일괄 업로드
 *
 * rclone을 사용하여 Google Drive에서 다운로드 (서비스 계정 불필요).
 * 시그니처 영상 & 쇼츠 영상 모두 지원. 원본 화질 그대로 업로드.
 *
 * 사전 준비:
 *   - rclone 설치 및 gdrive: 리모트 설정 완료
 *   - .env.local에 Cloudflare, Supabase 환경변수 설정
 *
 * 사용법:
 *   # 시그니처 영상 (기본)
 *   npx tsx scripts/batch-signature-upload.ts                          # 전체 업로드
 *   npx tsx scripts/batch-signature-upload.ts --member 홍서하           # 특정 멤버만
 *   npx tsx scripts/batch-signature-upload.ts --min-sig 10000          # 1만+ 영상만 (기본값)
 *   npx tsx scripts/batch-signature-upload.ts --dry-run                # 테스트
 *   npx tsx scripts/batch-signature-upload.ts --limit 5                # 개수 제한
 *   npx tsx scripts/batch-signature-upload.ts --use-local              # 로컬 파일 우선
 *
 *   # 쇼츠 영상
 *   npx tsx scripts/batch-signature-upload.ts --mode shorts            # 쇼츠 전체 업로드
 *   npx tsx scripts/batch-signature-upload.ts --mode shorts --dry-run  # 쇼츠 테스트
 *   npx tsx scripts/batch-signature-upload.ts --mode shorts --limit 3  # 쇼츠 3개만
 *   npx tsx scripts/batch-signature-upload.ts --mode shorts --unit crew # unit 지정
 */

import { getServiceClient } from './lib/supabase'
import { execSync, execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import dotenv from 'dotenv'

// ============================================
// 환경변수 & 클라이언트
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()

const TEMP_DIR = path.join(os.tmpdir(), 'rg-batch-upload')
const LOCAL_VIDEOS_DIR = path.join(__dirname, 'downloaded-videos', '시즌1')

// rclone 리모트 이름
const RCLONE_REMOTE = 'gdrive:'

// Google Drive 폴더 ID
const SEASON1_FOLDER_ID = '1sMgXm1z0L8CY_LP5MxzPO2Bf2arBHYL-'  // 시그니처 영상 (시즌1)
const SHORTS_FOLDER_ID = '1kEUuHsY3Ob_lvuy5gw2zkmVjQO58l3b1'   // 세로 쇼츠 영상

// ============================================
// 타입 정의
// ============================================

type UploadMode = 'signature' | 'shorts'

interface CliOptions {
  mode: UploadMode
  dryRun: boolean
  limit?: number
  memberFilter?: string
  minSig: number
  useLocal: boolean
  unit: 'excel' | 'crew'
}

interface RcloneFile {
  Path: string
  Name: string
  Size: number
  MimeType: string
  IsDir: boolean
  ID: string
}

interface SignatureTask {
  type: 'signature'
  driveFileId: string
  fileName: string
  filePath: string  // rclone 상대 경로 (멤버폴더/파일명)
  fileSize: number
  memberName: string
  memberId: number
  sigNumber: number
  signatureId: number
  localPath?: string
}

interface ShortsTask {
  type: 'shorts'
  driveFileId: string
  fileName: string
  filePath: string
  fileSize: number
  title: string
}

type UploadTask = SignatureTask | ShortsTask

// ============================================
// rclone 유틸리티
// ============================================

function checkRclone(): void {
  try {
    execSync('which rclone', { stdio: 'pipe' })
  } catch {
    throw new Error('rclone이 설치되지 않았습니다. brew install rclone')
  }

  try {
    const remotes = execSync('rclone listremotes', { encoding: 'utf-8' })
    if (!remotes.includes('gdrive:')) {
      throw new Error('rclone에 gdrive: 리모트가 설정되지 않았습니다. rclone config 실행 필요')
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('gdrive:')) throw err
    throw new Error('rclone 설정 확인 실패')
  }
}

function rcloneLsjson(folderId: string, recursive = false): RcloneFile[] {
  const args = [
    'lsjson',
    RCLONE_REMOTE,
    '--drive-root-folder-id', folderId,
    '--no-modtime',
  ]
  if (recursive) args.push('--recursive')

  const output = execFileSync('rclone', args, {
    encoding: 'utf-8',
    timeout: 120000,
  })

  return JSON.parse(output) as RcloneFile[]
}

function rcloneDownload(folderId: string, remotePath: string, localPath: string): void {
  // rclone copyto로 단일 파일 다운로드
  const remoteSpec = `${RCLONE_REMOTE}${remotePath}`
  execFileSync('rclone', [
    'copyto',
    remoteSpec,
    localPath,
    '--drive-root-folder-id', folderId,
    '--progress',
  ], {
    stdio: 'inherit',
    timeout: 600000, // 10분 타임아웃
  })
}

// ============================================
// Cloudflare Stream 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const stats = fs.statSync(filePath)
  const fileSize = stats.size

  if (fileSize > 200 * 1024 * 1024) {
    return await uploadViaTus(filePath, title, fileSize)
  }

  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])

  const formData = new FormData()
  formData.append('file', blob, path.basename(filePath))

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    }
  )

  const data = await response.json()

  if (!response.ok || !data.success) {
    const errorMsg = data.errors?.[0]?.message || JSON.stringify(data.errors)
    throw new Error(`Cloudflare 업로드 실패: ${errorMsg}`)
  }

  return data.result.uid
}

async function uploadViaTus(filePath: string, title: string, fileSize: number): Promise<string> {
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

// ============================================
// DB 조회 & 저장: 시그니처
// ============================================

async function loadSignatureMappings(minSig: number) {
  const { data: signatures, error: sigError } = await supabase
    .from('signatures')
    .select('id, sig_number, title')
    .gte('sig_number', minSig)
    .order('sig_number')

  if (sigError) throw new Error(`시그니처 조회 실패: ${sigError.message}`)

  const { data: members, error: memError } = await supabase
    .from('organization')
    .select('id, name')
    .order('name')

  if (memError) throw new Error(`멤버 조회 실패: ${memError.message}`)

  const { data: existingVideos, error: vidError } = await supabase
    .from('signature_videos')
    .select('signature_id, member_id')

  if (vidError) throw new Error(`signature_videos 조회 실패: ${vidError.message}`)

  const sigMap = new Map<number, number>()
  signatures?.forEach(s => sigMap.set(s.sig_number, s.id))

  const memberMap = new Map<string, number>()
  members?.forEach(m => memberMap.set(m.name, m.id))

  const registeredSet = new Set<string>()
  existingVideos?.forEach(v => registeredSet.add(`${v.signature_id}|${v.member_id}`))

  return { signatures: signatures || [], members: members || [], sigMap, memberMap, registeredSet }
}

async function saveSignatureToDb(signatureId: number, memberId: number, cloudflareUid: string) {
  const { data: existing } = await supabase
    .from('signature_videos')
    .select('id')
    .eq('signature_id', signatureId)
    .eq('member_id', memberId)
    .limit(1)

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('signature_videos')
      .update({
        cloudflare_uid: cloudflareUid,
        video_url: `https://iframe.videodelivery.net/${cloudflareUid}`,
      })
      .eq('id', existing[0].id)
    if (error) throw new Error(`DB 업데이트 실패: ${error.message}`)
    return { updated: true, id: existing[0].id }
  }

  const { data, error } = await supabase
    .from('signature_videos')
    .insert({
      signature_id: signatureId,
      member_id: memberId,
      video_url: `https://iframe.videodelivery.net/${cloudflareUid}`,
      cloudflare_uid: cloudflareUid,
    })
    .select()
    .single()

  if (error) throw new Error(`DB 삽입 실패: ${error.message}`)
  return { updated: false, id: data.id }
}

// ============================================
// DB 조회 & 저장: 쇼츠
// ============================================

async function loadExistingShorts(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('media_content')
    .select('title, cloudflare_uid')
    .eq('content_type', 'shorts')

  if (error) throw new Error(`media_content 조회 실패: ${error.message}`)

  const set = new Set<string>()
  data?.forEach(row => {
    if (row.title) set.add(row.title)
    if (row.cloudflare_uid) set.add(row.cloudflare_uid)
  })
  return set
}

async function saveShortsToDb(
  cloudflareUid: string,
  title: string,
  unit: 'excel' | 'crew'
): Promise<{ updated: boolean; id: number }> {
  const { data: existing } = await supabase
    .from('media_content')
    .select('id')
    .eq('cloudflare_uid', cloudflareUid)
    .limit(1)

  if (existing && existing.length > 0) {
    return { updated: true, id: existing[0].id }
  }

  const videoUrl = `https://iframe.videodelivery.net/${cloudflareUid}`
  const thumbnailUrl = `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg?time=7s`

  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'shorts' as const,
      title,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      cloudflare_uid: cloudflareUid,
      unit,
      view_count: 0,
      is_featured: false,
    })
    .select()
    .single()

  if (error) throw new Error(`DB 저장 실패: ${error.message}`)
  return { updated: false, id: data.id }
}

// ============================================
// 헬퍼 함수
// ============================================

function parseSigNumber(fileName: string): number | null {
  const match = fileName.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function extractTitle(fileName: string): string {
  return fileName.replace(/\.(mp4|mov|avi|mkv|webm|m4v)$/i, '').trim()
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function findLocalFile(memberName: string, fileName: string): string | null {
  const memberDir = path.join(LOCAL_VIDEOS_DIR, memberName)
  if (!fs.existsSync(memberDir)) return null

  const exactPath = path.join(memberDir, fileName)
  if (fs.existsSync(exactPath)) {
    const stats = fs.statSync(exactPath)
    if (stats.size > 10000) return exactPath
  }

  const sigNumber = parseSigNumber(fileName)
  if (!sigNumber) return null

  const files = fs.readdirSync(memberDir)
  for (const f of files) {
    const fSigNum = parseSigNumber(f)
    if (fSigNum === sigNumber) {
      const fPath = path.join(memberDir, f)
      const stats = fs.statSync(fPath)
      if (stats.size > 10000) return fPath
    }
  }

  return null
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    mode: 'signature',
    dryRun: false,
    minSig: 10000,
    useLocal: false,
    unit: 'excel',
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mode': options.mode = args[++i] as UploadMode; break
      case '--dry-run': options.dryRun = true; break
      case '--limit': options.limit = parseInt(args[++i], 10); break
      case '--member': options.memberFilter = args[++i]; break
      case '--min-sig': options.minSig = parseInt(args[++i], 10); break
      case '--use-local': options.useLocal = true; break
      case '--unit': options.unit = args[++i] as 'excel' | 'crew'; break
      case '--help':
        printUsage()
        process.exit(0)
    }
  }

  return options
}

function printUsage() {
  console.log(`
사용법:
  npx tsx scripts/batch-signature-upload.ts [옵션]

모드:
  --mode signature   시그니처 영상 업로드 (기본)
  --mode shorts      쇼츠 영상 업로드

공통 옵션:
  --dry-run          테스트 (다운로드/업로드 안 함)
  --limit <n>        최대 처리 개수
  --help             도움말

시그니처 옵션:
  --member <name>    특정 멤버만 처리
  --min-sig <num>    최소 sig_number (기본: 10000)
  --use-local        로컬 파일(downloaded-videos/) 우선 사용

쇼츠 옵션:
  --unit <unit>      excel 또는 crew (기본: excel)

예시:
  npx tsx scripts/batch-signature-upload.ts --dry-run
  npx tsx scripts/batch-signature-upload.ts --member 홍서하 --limit 1
  npx tsx scripts/batch-signature-upload.ts --mode shorts --dry-run
  npx tsx scripts/batch-signature-upload.ts --mode shorts --unit crew --limit 5
`)
}

// ============================================
// 태스크 빌드: 시그니처
// ============================================

async function buildSignatureTasks(
  options: CliOptions
): Promise<{ tasks: UploadTask[]; errors: string[]; totalDriveFiles: number }> {
  const dbMappings = await loadSignatureMappings(options.minSig)
  const { sigMap, memberMap, registeredSet } = dbMappings

  console.log(`  시그니처: ${dbMappings.signatures.length}개`)
  console.log(`  멤버: ${dbMappings.members.length}개`)
  console.log(`  등록된 영상: ${registeredSet.size}개`)

  const tasks: UploadTask[] = []
  const errors: string[] = []

  // rclone으로 시즌1 폴더 전체 스캔 (recursive)
  console.log('\n  Google Drive 스캔 중 (rclone)...')
  const allFiles = rcloneLsjson(SEASON1_FOLDER_ID, true)
  const videoFiles = allFiles.filter(f => !f.IsDir && f.MimeType?.startsWith('video/'))
  console.log(`  전체 영상: ${videoFiles.length}개`)

  // 멤버 폴더별로 분류
  for (const file of videoFiles) {
    const pathParts = file.Path.split('/')
    if (pathParts.length < 2) continue // 루트에 있는 파일은 스킵

    const memberName = pathParts[0]

    // 멤버 필터
    if (options.memberFilter && memberName !== options.memberFilter) continue

    const memberId = memberMap.get(memberName)
    if (!memberId) {
      // 처음 본 멤버만 에러에 추가
      const errMsg = `DB에 멤버 없음: ${memberName}`
      if (!errors.includes(errMsg)) errors.push(errMsg)
      continue
    }

    const sigNumber = parseSigNumber(file.Name)
    if (!sigNumber) {
      errors.push(`sig_number 파싱 실패: ${file.Path}`)
      continue
    }

    if (sigNumber < options.minSig) continue

    const signatureId = sigMap.get(sigNumber)
    if (!signatureId) continue

    const regKey = `${signatureId}|${memberId}`
    if (registeredSet.has(regKey)) continue

    let localPath: string | undefined
    if (options.useLocal) {
      const found = findLocalFile(memberName, file.Name)
      if (found) localPath = found
    }

    tasks.push({
      type: 'signature',
      driveFileId: file.ID,
      fileName: file.Name,
      filePath: file.Path,
      fileSize: file.Size,
      memberName,
      memberId,
      sigNumber,
      signatureId,
      localPath,
    })

    if (options.limit && tasks.length >= options.limit) break
  }

  // 멤버별 통계 출력
  const memberStats = new Map<string, number>()
  tasks.forEach(t => {
    if (t.type !== 'signature') return
    memberStats.set(t.memberName, (memberStats.get(t.memberName) || 0) + 1)
  })
  for (const [name, count] of memberStats) {
    console.log(`  ${name}: 누락 ${count}개`)
  }

  return { tasks, errors, totalDriveFiles: videoFiles.length }
}

// ============================================
// 태스크 빌드: 쇼츠
// ============================================

async function buildShortsTasks(
  options: CliOptions
): Promise<{ tasks: UploadTask[]; errors: string[]; totalDriveFiles: number }> {
  const existingTitles = await loadExistingShorts()
  console.log(`  등록된 쇼츠: ${existingTitles.size}개`)

  const tasks: UploadTask[] = []
  const errors: string[] = []

  console.log('\n  Google Drive 쇼츠 폴더 스캔 중 (rclone)...')
  const allFiles = rcloneLsjson(SHORTS_FOLDER_ID, true)
  const videoFiles = allFiles.filter(f => !f.IsDir && f.MimeType?.startsWith('video/'))
  console.log(`  전체 영상: ${videoFiles.length}개`)

  for (const file of videoFiles) {
    const title = extractTitle(file.Name)
    if (existingTitles.has(title)) continue

    tasks.push({
      type: 'shorts',
      driveFileId: file.ID,
      fileName: file.Name,
      filePath: file.Path,
      fileSize: file.Size,
      title,
    })

    if (options.limit && tasks.length >= options.limit) break
  }

  if (tasks.length > 0) {
    console.log(`  신규 쇼츠: ${tasks.length}개`)
  } else {
    console.log(`  신규 쇼츠 없음`)
  }

  return { tasks, errors, totalDriveFiles: videoFiles.length }
}

// ============================================
// 태스크 처리
// ============================================

async function processTask(
  task: UploadTask,
  index: number,
  total: number,
  unit: 'excel' | 'crew'
): Promise<{ success: boolean; updated: boolean }> {
  const label = task.type === 'signature'
    ? `[${index + 1}/${total}] sig${task.sigNumber} - ${task.memberName}`
    : `[${index + 1}/${total}] ${task.title}`

  console.log(`\n${label} (${formatBytes(task.fileSize)})`)

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  let filePath: string
  let isTemp = false
  const folderId = task.type === 'signature' ? SEASON1_FOLDER_ID : SHORTS_FOLDER_ID

  try {
    // 1. 파일 준비
    if (task.type === 'signature' && task.localPath) {
      filePath = task.localPath
      console.log(`   로컬 파일 사용: ${filePath}`)
    } else {
      const localDest = path.join(TEMP_DIR, task.fileName)
      console.log(`   다운로드 중...`)
      rcloneDownload(folderId, task.filePath, localDest)
      filePath = localDest
      isTemp = true
    }

    // 2. Cloudflare Stream 업로드
    console.log(`   Cloudflare 업로드 중...`)
    const cfTitle = task.type === 'signature'
      ? `sig${task.sigNumber}_${task.memberName}`
      : task.title
    const cloudflareUid = await uploadToCloudflare(filePath, cfTitle)

    // 3. DB 저장
    let result: { updated: boolean; id: number }

    if (task.type === 'signature') {
      result = await saveSignatureToDb(task.signatureId, task.memberId, cloudflareUid)
    } else {
      result = await saveShortsToDb(cloudflareUid, task.title, unit)
    }

    const statusLabel = result.updated ? '업데이트' : '신규'
    console.log(`   DB ${statusLabel} (uid: ${cloudflareUid})`)

    // 4. 임시 파일 삭제
    if (isTemp && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    return { success: true, updated: result.updated }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`   실패: ${msg}`)

    if (isTemp) {
      const tempPath = path.join(TEMP_DIR, task.fileName)
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath) } catch {}
      }
    }

    return { success: false, updated: false }
  }
}

// ============================================
// 메인
// ============================================

async function main() {
  const options = parseArgs()

  const modeLabel = options.mode === 'signature' ? '시그니처' : '쇼츠'

  console.log('='.repeat(60))
  console.log(`Google Drive -> Cloudflare Stream ${modeLabel} 일괄 업로드`)
  console.log('='.repeat(60))

  // 환경변수 체크
  const missing: string[] = []
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!CLOUDFLARE_ACCOUNT_ID) missing.push('CLOUDFLARE_ACCOUNT_ID')
  if (!CLOUDFLARE_API_TOKEN) missing.push('CLOUDFLARE_API_TOKEN')

  if (missing.length > 0) {
    console.error(`\n.env.local에 다음 환경변수가 필요합니다: ${missing.join(', ')}`)
    process.exit(1)
  }

  // rclone 체크
  checkRclone()

  console.log(`\n모드: ${options.dryRun ? 'DRY RUN (테스트)' : '실제 업로드'}`)
  console.log(`업로드 타입: ${modeLabel}`)
  if (options.mode === 'signature') {
    console.log(`최소 sig_number: ${options.minSig}`)
    if (options.memberFilter) console.log(`멤버 필터: ${options.memberFilter}`)
    if (options.useLocal) console.log(`로컬 파일 우선: ${LOCAL_VIDEOS_DIR}`)
  } else {
    console.log(`Unit: ${options.unit}`)
  }
  if (options.limit) console.log(`최대 처리: ${options.limit}개`)

  // 태스크 빌드
  console.log('\nDB 데이터 로드 및 Google Drive 스캔 중...')

  let tasks: UploadTask[]
  let errors: string[]
  let totalDriveFiles: number

  if (options.mode === 'signature') {
    const result = await buildSignatureTasks(options)
    tasks = result.tasks
    errors = result.errors
    totalDriveFiles = result.totalDriveFiles
  } else {
    const result = await buildShortsTasks(options)
    tasks = result.tasks
    errors = result.errors
    totalDriveFiles = result.totalDriveFiles
  }

  // 스캔 결과
  console.log('\n' + '-'.repeat(60))
  console.log(`Google Drive 영상: ${totalDriveFiles}개`)
  console.log(`업로드 대상 (신규): ${tasks.length}개`)
  if (errors.length > 0) {
    console.log(`경고/오류: ${errors.length}개`)
    errors.forEach(e => console.log(`  - ${e}`))
  }

  if (tasks.length === 0) {
    console.log('\n처리할 영상이 없습니다.')
    return
  }

  // 전체 용량 계산
  const totalSize = tasks.reduce((sum, t) => sum + t.fileSize, 0)
  console.log(`총 용량: ${formatBytes(totalSize)}`)

  // dry-run
  if (options.dryRun) {
    console.log('\n[DRY RUN] 업로드할 영상 목록:')

    if (options.mode === 'signature') {
      const byMember = new Map<string, SignatureTask[]>()
      tasks.forEach(t => {
        if (t.type !== 'signature') return
        const list = byMember.get(t.memberName) || []
        list.push(t)
        byMember.set(t.memberName, list)
      })

      for (const [member, memberTasks] of byMember) {
        const memberSize = memberTasks.reduce((s, t) => s + t.fileSize, 0)
        console.log(`\n  ${member} (${memberTasks.length}개, ${formatBytes(memberSize)}):`)
        memberTasks.forEach(t => {
          const localLabel = t.localPath ? ' [로컬]' : ''
          console.log(`    sig${t.sigNumber} - ${t.fileName} (${formatBytes(t.fileSize)})${localLabel}`)
        })
      }
    } else {
      tasks.forEach((t, idx) => {
        if (t.type !== 'shorts') return
        console.log(`  ${idx + 1}. ${t.fileName} (${formatBytes(t.fileSize)})`)
      })
    }

    console.log(`\n총 ${tasks.length}개 영상 (${formatBytes(totalSize)}) 업로드 대기 중`)
    return
  }

  // 실제 업로드
  console.log(`\n업로드 시작 (${tasks.length}개, ${formatBytes(totalSize)})...\n`)

  let success = 0
  let updated = 0
  let failed = 0

  for (let i = 0; i < tasks.length; i++) {
    const result = await processTask(tasks[i], i, tasks.length, options.unit)

    if (result.success) {
      success++
      if (result.updated) updated++
    } else {
      failed++
    }

    if (i < tasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // 최종 결과
  console.log('\n' + '='.repeat(60))
  console.log(`결과: 성공 ${success}개 (신규: ${success - updated}, 업데이트: ${updated}), 실패: ${failed}개`)

  if (success > 0) {
    console.log(`\nCloudflare 인코딩 확인: https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  }

  console.log('='.repeat(60))

  // 임시 폴더 정리
  if (fs.existsSync(TEMP_DIR)) {
    const tempFiles = fs.readdirSync(TEMP_DIR)
    tempFiles.forEach(f => {
      try { fs.unlinkSync(path.join(TEMP_DIR, f)) } catch {}
    })
  }
}

main().catch(err => {
  console.error(`\n오류: ${err.message || err}`)
  process.exit(1)
})
