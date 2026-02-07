/**
 * 계정 사전 생성 CSV 파일 생성 스크립트
 *
 * BJ, 관리자, 상위 랭커 계정을 CSV 파일로 생성
 *
 * 사용법: npx tsx scripts/generate-accounts-csv.ts
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

// .env.local에서 환경변수 로드

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = getServiceClient()

// 임시 비밀번호 생성 (8자리 랜덤)
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// 이메일 형식 생성 (닉네임 기반)
function generateEmail(nickname: string, type: string): string {
  // 특수문자 제거하고 영문/숫자만
  const clean = nickname.replace(/[^a-zA-Z0-9가-힣]/g, '')
  const prefix = type.toLowerCase()
  return `${prefix}_${clean}@rgfamily.kr`
}

interface AccountRow {
  type: string         // BJ, Admin, VIP, Top_Supporter
  nickname: string     // 표시 닉네임
  pandatv_id: string   // PandaTV 아이디 (BJ만)
  email: string        // 로그인 이메일
  temp_password: string // 임시 비밀번호
  role: string         // superadmin, admin, vip, member
  rank: string         // 랭킹 순위 (Top Supporter만)
  unit: string         // excel, crew
  notes: string        // 비고
}

async function main() {
  console.log('📊 계정 CSV 생성 시작...\n')

  const accounts: AccountRow[] = []

  // 1. BJ 계정 (organization 테이블에서)
  console.log('👤 BJ 계정 조회 중...')
  const { data: bjMembers, error: bjError } = await supabase
    .from('organization')
    .select('name, role, social_links, unit')
    .eq('is_active', true)
    .order('position_order')

  if (bjError) {
    console.error('BJ 조회 실패:', bjError.message)
    return
  }

  for (const bj of bjMembers || []) {
    const pandatvId = bj.social_links?.pandatv || ''
    const isRep = bj.role === '대표'

    accounts.push({
      type: 'BJ',
      nickname: bj.name,
      pandatv_id: pandatvId,
      email: pandatvId ? `${pandatvId}@pandatv.kr` : generateEmail(bj.name, 'bj'),
      temp_password: generateTempPassword(),
      role: isRep ? 'admin' : 'member',
      rank: '',
      unit: bj.unit || 'excel',
      notes: isRep ? '대표 (관리자 권한)' : 'BJ 멤버'
    })
  }

  console.log(`  ✅ BJ ${bjMembers?.length || 0}명 추가\n`)

  // 2. 관리자 계정 (별도 추가)
  console.log('🔐 관리자 계정 추가...')

  // 대표님/팀장 계정은 별도로 받아야 함 - 플레이스홀더 추가
  accounts.push({
    type: 'Admin',
    nickname: '운영팀장',
    pandatv_id: '',
    email: 'admin@rgfamily.kr',
    temp_password: generateTempPassword(),
    role: 'superadmin',
    rank: '',
    unit: '',
    notes: '최고 관리자 - 이메일 변경 필요'
  })

  console.log('  ✅ 관리자 1명 추가 (플레이스홀더)\n')

  // 3. 시즌 Top 20 후원자
  console.log('🏆 시즌 Top 20 후원자 조회 중...')
  const { data: seasonRankers, error: seasonError } = await supabase
    .from('season_rankings_public')
    .select('rank, donor_name, unit')
    .order('rank')
    .limit(20)

  if (seasonError) {
    console.error('시즌 랭킹 조회 실패:', seasonError.message)
  } else {
    for (const ranker of seasonRankers || []) {
      accounts.push({
        type: 'Top_Supporter',
        nickname: ranker.donor_name,
        pandatv_id: '',
        email: generateEmail(ranker.donor_name, 'vip'),
        temp_password: generateTempPassword(),
        role: ranker.rank <= 3 ? 'vip' : 'member',
        rank: `시즌 ${ranker.rank}위`,
        unit: ranker.unit || 'excel',
        notes: ranker.rank <= 3 ? 'VIP 자격' : '열혈 시청자'
      })
    }
    console.log(`  ✅ 시즌 Top 20 후원자 ${seasonRankers?.length || 0}명 추가\n`)
  }

  // 4. 전체 Top 10 후원자 (시즌과 중복 제외)
  console.log('👑 전체 Top 10 후원자 조회 중...')
  const { data: totalRankers, error: totalError } = await supabase
    .from('total_rankings_public')
    .select('rank, donor_name')
    .order('rank')
    .limit(10)

  if (totalError) {
    console.error('전체 랭킹 조회 실패:', totalError.message)
  } else {
    const existingNames = new Set(accounts.map(a => a.nickname))
    let addedCount = 0

    for (const ranker of totalRankers || []) {
      if (!existingNames.has(ranker.donor_name)) {
        accounts.push({
          type: 'Top_Supporter',
          nickname: ranker.donor_name,
          pandatv_id: '',
          email: generateEmail(ranker.donor_name, 'total'),
          temp_password: generateTempPassword(),
          role: ranker.rank <= 3 ? 'vip' : 'member',
          rank: `전체 ${ranker.rank}위`,
          unit: 'excel',
          notes: ranker.rank <= 3 ? 'VIP 자격 (전체 랭킹)' : '열혈 시청자'
        })
        addedCount++
      }
    }
    console.log(`  ✅ 전체 Top 10 후원자 중 ${addedCount}명 추가 (중복 제외)\n`)
  }

  // CSV 생성
  console.log('📝 CSV 파일 생성 중...')

  const headers = [
    '구분',
    '닉네임',
    'PandaTV_ID',
    '이메일(로그인)',
    '임시비밀번호',
    '권한',
    '랭킹',
    '소속',
    '비고'
  ]

  const csvLines = [headers.join(',')]

  for (const account of accounts) {
    const row = [
      account.type,
      `"${account.nickname}"`, // 따옴표로 감싸서 특수문자 처리
      account.pandatv_id,
      account.email,
      account.temp_password,
      account.role,
      account.rank,
      account.unit,
      account.notes
    ]
    csvLines.push(row.join(','))
  }

  const csvContent = csvLines.join('\n')
  const outputPath = path.join(process.cwd(), 'data', 'accounts.csv')

  // data 폴더 생성
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf-8') // BOM 추가 (Excel 한글 깨짐 방지)

  console.log(`\n✅ 완료! CSV 파일 생성됨: ${outputPath}`)
  console.log(`📊 총 ${accounts.length}개 계정 정보`)
  console.log('\n📋 요약:')
  console.log(`   - BJ: ${accounts.filter(a => a.type === 'BJ').length}명`)
  console.log(`   - 관리자: ${accounts.filter(a => a.type === 'Admin').length}명`)
  console.log(`   - Top 후원자: ${accounts.filter(a => a.type === 'Top_Supporter').length}명`)

  console.log('\n⚠️  주의사항:')
  console.log('   1. 임시 비밀번호는 첫 로그인 후 변경하도록 안내')
  console.log('   2. 관리자 이메일은 실제 이메일로 변경 필요')
  console.log('   3. 이 파일은 민감 정보 포함 - 외부 유출 금지!')
}

main().catch(console.error)
