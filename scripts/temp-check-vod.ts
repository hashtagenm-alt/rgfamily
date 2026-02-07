/**
 * VOD 폴더 확인 임시 스크립트
 */
import { google } from 'googleapis'
import * as fs from 'fs'

async function main() {
  const keyPath = './google-credentials.json'
  if (!fs.existsSync(keyPath)) {
    console.log('❌ 서비스 계정 파일 없음:', keyPath)
    return
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  })

  const drive = google.drive({ version: 'v3', auth })
  const folderId = '18TWcpi2Yp3mUbDJywyKPT-AVaP1cucv-'

  console.log('📁 Google Drive VOD 폴더')
  console.log('━'.repeat(60))

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size)',
      orderBy: 'name'
    })

    const files = res.data.files || []
    if (files.length === 0) {
      console.log('파일 없음 (폴더가 서비스 계정에 공유되었는지 확인 필요)')
      console.log('\n서비스 계정 이메일로 폴더를 공유해주세요.')
      return
    }

    const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder')
    const videos = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder')

    if (folders.length > 0) {
      console.log(`\n📂 하위 폴더 (${folders.length}개)`)
      console.log('─'.repeat(60))
      for (const f of folders) {
        console.log(`  📁 ${f.name} (${f.id})`)
      }
    }

    if (videos.length > 0) {
      console.log(`\n🎬 영상 파일 (${videos.length}개)`)
      console.log('─'.repeat(60))
      for (const f of videos) {
        const sizeGB = f.size ? (parseInt(f.size) / 1024 / 1024 / 1024).toFixed(2) : '-'
        console.log(`  🎞️ ${f.name.slice(0, 45).padEnd(45)} ${sizeGB} GB`)
      }
    }

    // 총 용량 계산
    const totalSize = videos.reduce((acc, f) => acc + (f.size ? parseInt(f.size) : 0), 0)
    console.log(`\n총 용량: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`)

  } catch (error: any) {
    if (error.code === 404) {
      console.log('❌ 폴더를 찾을 수 없습니다.')
    } else if (error.code === 403) {
      console.log('❌ 접근 권한 없음 - 서비스 계정에 폴더 공유 필요')
    } else {
      console.log('오류:', error.message)
    }
  }
}

main()
