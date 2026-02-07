/**
 * 시그니처 30088 추가 스크립트
 * 제목: 슈퍼 김회장
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

const BUCKET_NAME = 'vip-signatures'
const SIG_NUMBER = 30088
const SIG_TITLE = '슈퍼 김회장'

async function uploadThumbnail() {
  console.log('📤 썸네일 업로드 중...')

  const filePath = path.join(__dirname, '..', 'thumbnails', `sig-${SIG_NUMBER}.gif`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`썸네일 파일을 찾을 수 없습니다: ${filePath}`)
  }

  const fileBuffer = fs.readFileSync(filePath)
  const fileName = `sig-${SIG_NUMBER}.gif`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(`thumbnails/${fileName}`, fileBuffer, {
      contentType: 'image/gif',
      upsert: true,
    })

  if (error) {
    throw new Error(`업로드 실패: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(`thumbnails/${fileName}`)

  console.log(`   ✅ 업로드 성공: ${urlData.publicUrl}`)
  return urlData.publicUrl
}

async function addSignature(thumbnailUrl: string) {
  console.log('💾 시그니처 레코드 추가 중...')

  const { data, error } = await supabase
    .from('signatures')
    .insert({
      sig_number: SIG_NUMBER,
      title: `${SIG_NUMBER} - ${SIG_TITLE}`,
      description: '',
      thumbnail_url: thumbnailUrl,
      unit: 'excel',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`DB 추가 실패: ${error.message}`)
  }

  console.log('   ✅ 시그니처 추가 완료')
  return data
}

async function verifySignature() {
  console.log('✅ 시그니처 확인 중...')

  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('sig_number', SIG_NUMBER)
    .single()

  if (error) {
    throw new Error(`확인 실패: ${error.message}`)
  }

  console.log('   ✅ 시그니처 확인 완료:')
  console.log(`      - ID: ${data.id}`)
  console.log(`      - 번호: ${data.sig_number}`)
  console.log(`      - 제목: ${data.title}`)
  console.log(`      - 썸네일: ${data.thumbnail_url}`)
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🎯 시그니처 ${SIG_NUMBER} - ${SIG_TITLE} 추가`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  try {
    const thumbnailUrl = await uploadThumbnail()
    console.log('')

    await addSignature(thumbnailUrl)
    console.log('')

    await verifySignature()
    console.log('')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 모든 작업 완료!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  } catch (error) {
    console.error('')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ 오류 발생:', error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    process.exit(1)
  }
}

main().catch(console.error)
