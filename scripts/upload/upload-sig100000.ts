/**
 * sig100000 영상 3개 업로드 (시즌1 폴더)
 * - 채은/100,000 채은(김회장).mp4 (281.2MB) → DB ID:203 업데이트
 * - 청아/100,000 르큐리 청아.mp4 (277.6MB) → DB ID:204 업데이트
 * - 린아/100000 린아.mp4 (341.1MB) → 신규 삽입
 */

import { getServiceClient } from '../lib/supabase'
import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const supabase = getServiceClient()
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!
const SEASON1_FOLDER_ID = '1sMgXm1z0L8CY_LP5MxzPO2Bf2arBHYL-'
const TEMP_DIR = path.join(os.tmpdir(), 'rg-sig100000')

interface UploadTask {
  drivePath: string
  memberName: string
  memberId: number
  signatureId: number
  existingVideoId?: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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
  console.log('sig100000 영상 업로드 (시즌1 폴더)')
  console.log('='.repeat(60))

  // sig100000의 signature_id 조회
  const { data: sig } = await supabase
    .from('signatures')
    .select('id')
    .eq('sig_number', 100000)
    .single()

  if (!sig) {
    console.error('sig100000 시그니처 레코드가 없습니다')
    process.exit(1)
  }
  const signatureId = sig.id
  console.log(`sig100000 signature_id: ${signatureId}`)

  // 멤버 ID 조회
  const { data: members } = await supabase
    .from('organization')
    .select('id, name')
    .in('name', ['채은', '청아', '린아'])

  if (!members) {
    console.error('멤버 조회 실패')
    process.exit(1)
  }

  const memberMap = new Map(members.map(m => [m.name, m.id]))
  console.log('멤버:', [...memberMap.entries()].map(([n, id]) => `${n}=${id}`).join(', '))

  // 기존 레코드 확인
  const { data: existingVids } = await supabase
    .from('signature_videos')
    .select('id, member_id, cloudflare_uid')
    .eq('signature_id', signatureId)

  const existingMap = new Map((existingVids || []).map(v => [v.member_id, v]))

  const tasks: UploadTask[] = [
    {
      drivePath: '채은/100,000 채은(김회장).mp4',
      memberName: '채은',
      memberId: memberMap.get('채은')!,
      signatureId,
      existingVideoId: existingMap.get(memberMap.get('채은')!)?.id,
    },
    {
      drivePath: '청아/100,000 르큐리 청아.mp4',
      memberName: '청아',
      memberId: memberMap.get('청아')!,
      signatureId,
      existingVideoId: existingMap.get(memberMap.get('청아')!)?.id,
    },
    {
      drivePath: '린아/100000 린아.mp4',
      memberName: '린아',
      memberId: memberMap.get('린아')!,
      signatureId,
      existingVideoId: existingMap.get(memberMap.get('린아')!)?.id,
    },
  ]

  for (const t of tasks) {
    const status = t.existingVideoId ? `업데이트 (ID:${t.existingVideoId})` : '신규'
    console.log(`  ${t.memberName}: ${t.drivePath} → ${status}`)
  }

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

  let success = 0
  let failed = 0

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    console.log(`\n[${i + 1}/${tasks.length}] sig100000 ${t.memberName}`)

    const localFile = path.join(TEMP_DIR, `${t.memberName}.mp4`)

    try {
      // rclone 다운로드
      console.log('   다운로드 중...')
      execFileSync('rclone', [
        'copyto',
        `gdrive:${t.drivePath}`,
        localFile,
        '--drive-root-folder-id', SEASON1_FOLDER_ID,
        '--progress',
      ], { stdio: 'inherit', timeout: 600000 })

      const fileSize = fs.statSync(localFile).size
      console.log(`   파일 크기: ${formatBytes(fileSize)}`)

      // Cloudflare 업로드 (모두 200MB 초과이므로 TUS)
      console.log('   Cloudflare 업로드 중...')
      const uid = await uploadViaTus(localFile, fileSize)
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
      console.error(`   실패: ${msg}`)
      failed++
    } finally {
      if (fs.existsSync(localFile)) {
        try { fs.unlinkSync(localFile) } catch {}
      }
    }

    if (i < tasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`결과: 성공 ${success}개, 실패 ${failed}개`)
  console.log('='.repeat(60))

  // 임시 디렉토리 정리
  try { fs.rmdirSync(TEMP_DIR) } catch {}
}

main().catch(err => {
  console.error(`\n오류: ${err.message || err}`)
  process.exit(1)
})
