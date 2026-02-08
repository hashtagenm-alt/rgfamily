/**c
 * VIP 계정 비밀번호 전체 재설정 및 CSV 출력
 * - 모든 VIP 계정의 비밀번호를 새로 설정
 * - 기존 계정 포함 전체 아이디/비밀번호 CSV 생성
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = getServiceClient()

// 랜덤 비밀번호 생성 (12자리, 영문+숫자+특수문자)
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const special = '!@#$%'
  let password = ''

  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  for (let i = 0; i < 2; i++) {
    password += special.charAt(Math.floor(Math.random() * special.length))
  }

  return password
}

interface AccountResult {
  nickname: string
  email: string
visibleEmail: string
  password: string
  seasonRank: number | null
  totalRank: number | null
  status: string
}

async function main() {
  console.log('=== VIP 계정 비밀번호 전체 재설정 ===\n')

  // 1. 시즌 랭킹 및 전체 랭킹 조회
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

  // 랭킹 맵 생성
  const seasonRankMap = new Map<string, number>()
  const totalRankMap = new Map<string, number>()
  seasonRanks?.forEach(r => seasonRankMap.set(r.donor_name, r.rank))
  totalRanks?.forEach(r => totalRankMap.set(r.donor_name, r.rank))

  // 중복 제거 닉네임 목록
  const allNicknames = new Set<string>()
  seasonRanks?.forEach(r => allNicknames.add(r.donor_name))
  totalRanks?.forEach(r => allNicknames.add(r.donor_name))

  console.log(`처리 대상: ${allNicknames.size}명\n`)

  // 2. 해당 닉네임의 프로필 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, email, role, account_type')
    .in('nickname', Array.from(allNicknames))

  const profileByNickname = new Map<string, any>()
  profiles?.forEach(p => {
    if (p.nickname) profileByNickname.set(p.nickname, p)
  })

  // 3. 각 계정 비밀번호 재설정
  const results: AccountResult[] = []

  for (const nickname of allNicknames) {
    const profile = profileByNickname.get(nickname)
    const seasonRank = seasonRankMap.get(nickname) ?? null
    const totalRank = totalRankMap.get(nickname) ?? null

    if (!profile) {
      console.log(`[누락] ${nickname} - 프로필 없음`)
      continue
    }

    const newPassword = generatePassword()

    try {
      // 비밀번호 업데이트
      const { error } = await supabase.auth.admin.updateUserById(
        profile.id,
        { password: newPassword }
      )

      if (error) {
        console.log(`[에러] ${nickname} - ${error.message}`)
        results.push({
          nickname,
          email: profile.email || '',
          visibleEmail: profile.email || '',
          password: '에러발생',
          seasonRank,
          totalRank,
          status: 'error'
        })
        continue
      }

      // VIP 역할 확인/설정
      if (profile.role !== 'vip' && profile.role !== 'admin' && profile.role !== 'superadmin') {
        await supabase
          .from('profiles')
          .update({ role: 'vip' })
          .eq('id', profile.id)
      }

      console.log(`[완료] ${nickname} - ${profile.email}`)
      results.push({
        nickname,
        email: profile.email || '',
        visibleEmail: profile.email || '',
        password: newPassword,
        seasonRank,
        totalRank,
        status: 'success'
      })

    } catch (err: any) {
      console.log(`[에러] ${nickname} - ${err.message}`)
      results.push({
        nickname,
        email: profile.email || '',
        visibleEmail: profile.email || '',
        password: '에러발생',
        seasonRank,
        totalRank,
        status: 'error'
      })
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // 4. 시즌 랭킹 순으로 정렬
  results.sort((a, b) => {
    // 시즌 랭킹이 있는 것 먼저
    if (a.seasonRank !== null && b.seasonRank === null) return -1
    if (a.seasonRank === null && b.seasonRank !== null) return 1
    // 둘 다 시즌 랭킹 있으면 순위순
    if (a.seasonRank !== null && b.seasonRank !== null) {
      return a.seasonRank - b.seasonRank
    }
    // 둘 다 없으면 전체 랭킹순
    if (a.totalRank !== null && b.totalRank !== null) {
      return a.totalRank - b.totalRank
    }
    return 0
  })

  // 5. CSV 파일 생성
  const csvHeader = '번호,닉네임,이메일(아이디),비밀번호,시즌랭킹,전체랭킹'
  const csvRows = results.map((r, idx) => {
    const seasonRank = r.seasonRank ?? '-'
    const totalRank = r.totalRank ?? '-'
    const safeNickname = `"${r.nickname.replace(/"/g, '""')}"`
    return `${idx + 1},${safeNickname},${r.email},${r.password},${seasonRank},${totalRank}`
  })

  const csvContent = [csvHeader, ...csvRows].join('\n')
  const csvPath = path.join(process.cwd(), 'vip-accounts-full.csv')
  fs.writeFileSync(csvPath, '\uFEFF' + csvContent, 'utf8')

  // 6. 결과 출력
  console.log('\n' + '='.repeat(80))
  console.log('=== 결과 요약 ===')
  console.log('='.repeat(80))
  console.log(`성공: ${results.filter(r => r.status === 'success').length}명`)
  console.log(`에러: ${results.filter(r => r.status === 'error').length}명`)
  console.log(`\nCSV 파일 저장: ${csvPath}`)

  // 콘솔 표 출력
  console.log('\n' + '='.repeat(120))
  console.log('VIP 계정 전체 목록')
  console.log('='.repeat(120))
  console.log('번호  ' + '닉네임'.padEnd(28) + '이메일(아이디)'.padEnd(42) + '비밀번호'.padEnd(16) + '시즌  전체')
  console.log('-'.repeat(120))

  results.forEach((r, idx) => {
    const num = String(idx + 1).padEnd(6)
    const nick = r.nickname.slice(0, 26).padEnd(28)
    const email = r.email.slice(0, 40).padEnd(42)
    const pwd = r.password.padEnd(16)
    const season = String(r.seasonRank ?? '-').padEnd(6)
    const total = String(r.totalRank ?? '-')
    console.log(`${num}${nick}${email}${pwd}${season}${total}`)
  })
}

main().catch(console.error)
