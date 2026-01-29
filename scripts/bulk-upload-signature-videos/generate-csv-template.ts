/**
 * CSV 템플릿 생성 스크립트
 *
 * 사용법: npx tsx scripts/bulk-upload-signature-videos/generate-csv-template.ts
 *
 * 이 스크립트는 signature_videos 대량 업로드를 위한 CSV 템플릿을 생성합니다.
 * 생성된 CSV에 파일 경로만 채워서 업로드 스크립트에 사용하세요.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경변수 설정 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateTemplate() {
  console.log('📋 시그니처 영상 업로드용 CSV 템플릿 생성 중...\n')

  // 1. 시그니처 목록 조회
  const { data: signatures, error: sigError } = await supabase
    .from('signatures')
    .select('id, sig_number, title')
    .order('sig_number', { ascending: true })

  if (sigError) {
    console.error('❌ 시그니처 조회 실패:', sigError.message)
    process.exit(1)
  }

  // 2. 멤버 목록 조회
  const { data: members, error: memError } = await supabase
    .from('organization')
    .select('id, name')
    .eq('is_active', true)
    .order('position_order', { ascending: true })

  if (memError) {
    console.error('❌ 멤버 조회 실패:', memError.message)
    process.exit(1)
  }

  console.log(`✅ 시그니처 ${signatures?.length}개, 멤버 ${members?.length}명 조회됨\n`)

  // 3. 멤버 목록 출력
  console.log('📌 멤버 목록 (member_id, name):')
  console.log('─'.repeat(40))
  members?.forEach((m) => {
    console.log(`   ${m.id}\t${m.name}`)
  })
  console.log('')

  // 4. 시그니처 목록 출력 (처음 10개만)
  console.log('📌 시그니처 목록 (signature_id, sig_number, title) - 처음 10개:')
  console.log('─'.repeat(60))
  signatures?.slice(0, 10).forEach((s) => {
    console.log(`   ${s.id}\t${s.sig_number}\t${s.title}`)
  })
  console.log(`   ... 외 ${(signatures?.length || 0) - 10}개\n`)

  // 5. CSV 파일 생성
  const outputDir = path.dirname(__filename)

  // 5-1. 빈 템플릿 (사용자가 직접 채움)
  const templatePath = path.join(outputDir, 'upload-template.csv')
  const templateHeader = 'file_path,signature_id,sig_number,member_id,member_name'
  const templateExample = [
    '# 예시: 아래 형식으로 파일 경로와 매핑 정보를 입력하세요',
    '# file_path: 로컬 비디오 파일 경로 (필수)',
    '# signature_id 또는 sig_number 중 하나 필수 (둘 다 있으면 signature_id 우선)',
    '# member_id 또는 member_name 중 하나 필수 (둘 다 있으면 member_id 우선)',
    '#',
    '# /path/to/video1.mp4,129,,59,',
    '# /path/to/video2.mp4,,777,,린아',
    '# /path/to/video3.mp4,130,,60,가애'
  ].join('\n')

  fs.writeFileSync(templatePath, `${templateHeader}\n${templateExample}\n`)
  console.log(`✅ 빈 템플릿 생성됨: ${templatePath}`)

  // 5-2. 시그니처-멤버 전체 조합 CSV (참고용)
  const refPath = path.join(outputDir, 'reference-all-combinations.csv')
  const refHeader = 'signature_id,sig_number,title,member_id,member_name,file_path'
  const refRows: string[] = [refHeader]

  // 각 시그니처마다 모든 멤버 조합 생성
  signatures?.forEach((sig) => {
    members?.forEach((mem) => {
      refRows.push(`${sig.id},${sig.sig_number},"${sig.title}",${mem.id},${mem.name},`)
    })
  })

  fs.writeFileSync(refPath, refRows.join('\n'))
  console.log(`✅ 전체 조합 참조 CSV 생성됨: ${refPath}`)
  console.log(`   (${signatures?.length} 시그니처 × ${members?.length} 멤버 = ${(signatures?.length || 0) * (members?.length || 0)} 조합)\n`)

  // 5-3. 시그니처 목록만
  const sigListPath = path.join(outputDir, 'signatures-list.csv')
  const sigHeader = 'signature_id,sig_number,title'
  const sigRows = [sigHeader, ...(signatures?.map(s => `${s.id},${s.sig_number},"${s.title}"`) || [])]
  fs.writeFileSync(sigListPath, sigRows.join('\n'))
  console.log(`✅ 시그니처 목록 CSV: ${sigListPath}`)

  // 5-4. 멤버 목록만
  const memListPath = path.join(outputDir, 'members-list.csv')
  const memHeader = 'member_id,member_name'
  const memRows = [memHeader, ...(members?.map(m => `${m.id},${m.name}`) || [])]
  fs.writeFileSync(memListPath, memRows.join('\n'))
  console.log(`✅ 멤버 목록 CSV: ${memListPath}`)

  console.log('\n' + '═'.repeat(60))
  console.log('📝 사용 방법:')
  console.log('1. upload-template.csv 파일을 열어 매핑 정보 입력')
  console.log('2. file_path에 로컬 비디오 파일 경로 입력')
  console.log('3. signature_id 또는 sig_number 중 하나 입력')
  console.log('4. member_id 또는 member_name 중 하나 입력')
  console.log('5. 업로드 스크립트 실행:')
  console.log('   npx tsx scripts/bulk-upload-signature-videos/upload.ts')
  console.log('═'.repeat(60))
}

generateTemplate().catch(console.error)
