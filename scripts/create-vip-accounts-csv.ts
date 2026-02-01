/**
 * VIP 계정 일괄 생성 및 CSV 출력
 * - 시즌 랭킹 Top 50 + 전체 랭킹 Top 50 (중복 제거)
 * - 계정 생성 + VIP 역할 부여
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey)

// 닉네임을 이메일 친화적인 문자열로 변환
function nicknameToEmail(nickname: string, index: number): string {
  // 특수문자 제거하고 영문/숫자만 남김
  const clean = nickname
    .replace(/[^\w가-힣]/g, '')
    .toLowerCase()
    .slice(0, 20)

  // 한글이 있으면 index 기반으로
  if (/[가-힣]/.test(clean)) {
    return `vip${String(index).padStart(3, '0')}@rgfamily.kr`
  }

  return `${clean || 'vip' + index}@rgfamily.kr`
}

// 랜덤 비밀번호 생성 (12자리, 영문+숫자+특수문자)
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const special = '!@#$%'
  let password = ''

  // 10자리 영문/숫자
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // 2자리 특수문자
  for (let i = 0; i < 2; i++) {
    password += special.charAt(Math.floor(Math.random() * special.length))
  }

  return password
}

interface RankingUser {
  nickname: string
  seasonRank: number | null
  totalRank: number | null
}

interface CreatedAccount {
  nickname: string
  email: string
  password: string
  userId: string
  seasonRank: number | null
  totalRank: number | null
  status: 'created' | 'existing' | 'error'
  message?: string
}

async function main() {
  console.log('=== VIP 계정 일괄 생성 시작 ===\n')

  // 1. 랭킹 데이터 조회
  const { data: seasonRanks } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name')
    .eq('season_id', 1)
    .order('rank')
    .limit(50)

  const { data: totalRanks } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name')
    .order('rank')
    .limit(50)

  // 2. 중복 제거하여 사용자 목록 생성
  const userMap = new Map<string, RankingUser>()

  seasonRanks?.forEach(r => {
    if (!userMap.has(r.donor_name)) {
      userMap.set(r.donor_name, { nickname: r.donor_name, seasonRank: r.rank, totalRank: null })
    } else {
      userMap.get(r.donor_name)!.seasonRank = r.rank
    }
  })

  totalRanks?.forEach(r => {
    if (!userMap.has(r.donor_name)) {
      userMap.set(r.donor_name, { nickname: r.donor_name, seasonRank: null, totalRank: r.rank })
    } else {
      userMap.get(r.donor_name)!.totalRank = r.rank
    }
  })

  const users = Array.from(userMap.values())
  console.log(`총 ${users.length}명 처리 예정\n`)

  // 3. 기존 프로필 조회 (이미 계정이 있는지 확인)
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, email, role, account_type')

  const existingByNickname = new Map<string, any>()
  existingProfiles?.forEach(p => {
    if (p.nickname) existingByNickname.set(p.nickname, p)
  })

  // 4. 계정 생성
  const results: CreatedAccount[] = []
  let createdCount = 0
  let existingCount = 0
  let errorCount = 0

  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const email = nicknameToEmail(user.nickname, i + 1)
    const password = generatePassword()

    // 이미 프로필이 있는지 확인
    const existing = existingByNickname.get(user.nickname)

    if (existing && existing.account_type === 'real') {
      // 이미 실제 계정이 있음 - VIP 역할만 확인/부여
      if (existing.role !== 'vip' && existing.role !== 'admin' && existing.role !== 'superadmin') {
        await supabase
          .from('profiles')
          .update({ role: 'vip' })
          .eq('id', existing.id)
      }

      results.push({
        nickname: user.nickname,
        email: existing.email || '기존계정',
        password: '기존비밀번호사용',
        userId: existing.id,
        seasonRank: user.seasonRank,
        totalRank: user.totalRank,
        status: 'existing',
        message: '기존 계정 (VIP 역할 확인됨)'
      })
      existingCount++
      console.log(`[기존] ${user.nickname} - 이미 계정 있음`)
      continue
    }

    try {
      // 새 계정 생성
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          nickname: user.nickname
        }
      })

      if (authError) {
        // 이메일 중복인 경우 다른 이메일 시도
        if (authError.message.includes('already been registered')) {
          const altEmail = `vip${Date.now()}${i}@rgfamily.kr`
          const { data: retryData, error: retryError } = await supabase.auth.admin.createUser({
            email: altEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
              nickname: user.nickname
            }
          })

          if (retryError) throw retryError

          // 프로필 생성/업데이트
          await supabase.from('profiles').upsert({
            id: retryData.user!.id,
            nickname: user.nickname,
            email: altEmail,
            role: 'vip',
            account_type: 'real'
          })

          results.push({
            nickname: user.nickname,
            email: altEmail,
            password: password,
            userId: retryData.user!.id,
            seasonRank: user.seasonRank,
            totalRank: user.totalRank,
            status: 'created'
          })
          createdCount++
          console.log(`[생성] ${user.nickname} - ${altEmail}`)
          continue
        }
        throw authError
      }

      // 프로필 생성/업데이트
      const userId = authData.user!.id

      // 기존 가상 프로필이 있으면 삭제
      if (existing && existing.account_type === 'virtual') {
        await supabase.from('profiles').delete().eq('id', existing.id)
      }

      await supabase.from('profiles').upsert({
        id: userId,
        nickname: user.nickname,
        email: email,
        role: 'vip',
        account_type: 'real'
      })

      results.push({
        nickname: user.nickname,
        email: email,
        password: password,
        userId: userId,
        seasonRank: user.seasonRank,
        totalRank: user.totalRank,
        status: 'created'
      })
      createdCount++
      console.log(`[생성] ${user.nickname} - ${email}`)

    } catch (err: any) {
      results.push({
        nickname: user.nickname,
        email: email,
        password: password,
        userId: '',
        seasonRank: user.seasonRank,
        totalRank: user.totalRank,
        status: 'error',
        message: err.message
      })
      errorCount++
      console.log(`[에러] ${user.nickname} - ${err.message}`)
    }

    // Rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // 5. CSV 파일 생성
  const csvHeader = '닉네임,이메일(아이디),비밀번호,시즌랭킹,전체랭킹,상태,비고'
  const csvRows = results.map(r => {
    const seasonRank = r.seasonRank ?? '-'
    const totalRank = r.totalRank ?? '-'
    const note = r.message || ''
    // CSV에서 특수문자 이스케이프
    const safeNickname = `"${r.nickname.replace(/"/g, '""')}"`
    return `${safeNickname},${r.email},${r.password},${seasonRank},${totalRank},${r.status},${note}`
  })

  const csvContent = [csvHeader, ...csvRows].join('\n')
  const csvPath = path.join(process.cwd(), 'vip-accounts.csv')
  fs.writeFileSync(csvPath, '\uFEFF' + csvContent, 'utf8') // BOM for Excel

  console.log('\n' + '='.repeat(60))
  console.log('=== 결과 요약 ===')
  console.log('='.repeat(60))
  console.log(`생성됨: ${createdCount}명`)
  console.log(`기존계정: ${existingCount}명`)
  console.log(`에러: ${errorCount}명`)
  console.log(`\nCSV 파일 저장: ${csvPath}`)

  // 6. 콘솔에 표 형태로 출력
  console.log('\n' + '='.repeat(100))
  console.log('VIP 계정 목록')
  console.log('='.repeat(100))
  console.log('닉네임'.padEnd(30) + '이메일'.padEnd(30) + '비밀번호'.padEnd(15) + '시즌'.padEnd(5) + '전체'.padEnd(5) + '상태')
  console.log('-'.repeat(100))

  for (const r of results) {
    const nick = r.nickname.slice(0, 28).padEnd(30)
    const email = r.email.slice(0, 28).padEnd(30)
    const pwd = r.password.slice(0, 13).padEnd(15)
    const season = String(r.seasonRank ?? '-').padEnd(5)
    const total = String(r.totalRank ?? '-').padEnd(5)
    console.log(`${nick}${email}${pwd}${season}${total}${r.status}`)
  }
}

main().catch(console.error)
