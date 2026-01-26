/**
 * 고화질 영상 업로드 스크립트
 * - 기존 비디오 레코드 삭제 후 새로 업로드
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '/Users/bagjaeseog/rg-family/.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('환경변수 설정 필요')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

const MEMBER_ID_MAP: Record<string, number> = {
  '가애': 60, '가윤': 63, '린아': 59, '설윤': 62,
  '월아': 66, '채은': 61, '청아': 71, '퀸로니': 68,
  '키키': 72, '한백설': 67, '한세아': 70, '해린': 69, '홍서하': 65,
}

const BASE_DIR = '/tmp/signature-videos-compressed-hq/01화'

async function getSignatureId(sigNumber: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('signatures')
    .select('id')
    .eq('sig_number', sigNumber)
    .single()
  return error || !data ? null : data.id
}

async function deleteExistingVideo(sigId: number, memberId: number): Promise<void> {
  const { error } = await supabase
    .from('signature_videos')
    .delete()
    .eq('signature_id', sigId)
    .eq('member_id', memberId)

  if (error) {
    console.log(`   Warning: Could not delete existing record: ${error.message}`)
  }
}

async function uploadVideo(filePath: string, memberId: number, sigNumber: number): Promise<string | null> {
  const timestamp = new Date().getTime()
  const storagePath = `signature-videos/member-${memberId}/${sigNumber}_${timestamp}.mp4`
  const fileBuffer = fs.readFileSync(filePath)

  const { error } = await supabase.storage
    .from('videos')
    .upload(storagePath, fileBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    })

  if (error) {
    console.log(`   Upload error: ${error.message}`)
    return null
  }

  const { data: urlData } = supabase.storage.from('videos').getPublicUrl(storagePath)
  return urlData.publicUrl
}

async function main() {
  const folders = Object.keys(MEMBER_ID_MAP)
  let totalUploaded = 0
  let totalFailed = 0

  for (const memberName of folders) {
    const memberId = MEMBER_ID_MAP[memberName]
    const folderPath = path.join(BASE_DIR, memberName)

    if (!fs.existsSync(folderPath)) {
      console.log(`Skipping ${memberName} (folder not found)`)
      continue
    }

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.mp4'))
    console.log(`\n${memberName} (ID: ${memberId}) - ${files.length} videos`)

    for (const file of files) {
      const sigMatch = file.match(/^(\d+)/)
      if (!sigMatch) {
        console.log(`   Cannot parse sig number: ${file}`)
        continue
      }

      const sigNumber = parseInt(sigMatch[1], 10)
      const sigId = await getSignatureId(sigNumber)

      if (!sigId) {
        console.log(`   Signature ${sigNumber} not found in DB`)
        continue
      }

      const filePath = path.join(folderPath, file)
      const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024)

      console.log(`   ${file} (${fileSizeMB.toFixed(1)}MB) -> sig ${sigNumber}`)

      // Delete existing record first
      await deleteExistingVideo(sigId, memberId)

      const videoUrl = await uploadVideo(filePath, memberId, sigNumber)

      if (videoUrl) {
        const { error: insertError } = await supabase
          .from('signature_videos')
          .insert({
            signature_id: sigId,
            member_id: memberId,
            video_url: videoUrl,
          })

        if (insertError) {
          console.log(`   DB error: ${insertError.message}`)
          totalFailed++
        } else {
          console.log(`   Done`)
          totalUploaded++
        }
      } else {
        totalFailed++
      }
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`Uploaded: ${totalUploaded}`)
  console.log(`Failed: ${totalFailed}`)
}

main().catch(console.error)
