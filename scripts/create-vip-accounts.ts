/**
 * VIP 계정 생성 및 프로필 연결 스크립트
 *
 * 사용법:
 *   npx tsx scripts/create-vip-accounts.ts [--dry-run]
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

interface VipAccount {
  rank: number
  nickname: string
  email: string
  password: string
  note: string
}

function parseCSV(content: string): VipAccount[] {
  const lines = content.split('\n')
  const accounts: VipAccount[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // CSV 파싱 (따옴표 처리)
    const match = line.match(/^(\d+),"([^"]+)",([^,]+),([^,]+),(.+)$/)
    if (match) {
      accounts.push({
        rank: parseInt(match[1]),
        nickname: match[2],
        email: match[3],
        password: match[4],
        note: match[5]
      })
    }
  }

  return accounts
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔐 VIP 계정 생성 및 프로필 연결')
  if (dryRun) console.log('⚠️  DRY-RUN 모드 (실제 생성 안함)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // CSV 파일 읽기
  const csvPath = path.join(process.cwd(), 'vip-accounts.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const accounts = parseCSV(csvContent)

  console.log(`📋 총 ${accounts.length}개 계정 처리 예정\n`)

  // 기존 프로필 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, email, role')

  const profileMap = new Map<string, any>()
  for (const p of profiles || []) {
    profileMap.set(p.nickname, p)
  }

  // 기존 auth users 조회
  const { data: authData } = await supabase.auth.admin.listUsers()
  const existingEmails = new Set((authData?.users || []).map(u => u.email))

  let created = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const account of accounts) {
    console.log(`[${account.rank}] ${account.nickname}`)

    // 이미 존재하는 이메일 확인
    if (existingEmails.has(account.email)) {
      console.log(`   ⏭️  이미 존재: ${account.email}`)
      skipped++
      continue
    }

    // 프로필 찾기
    const profile = profileMap.get(account.nickname)

    if (dryRun) {
      console.log(`   📧 생성 예정: ${account.email}`)
      console.log(`   🔑 비밀번호: ${account.password}`)
      console.log(`   👤 프로필: ${profile ? '연결됨' : '새로 생성'}`)
      created++
      continue
    }

    try {
      // 계정 생성
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          nickname: account.nickname,
          rank: account.rank
        }
      })

      if (createError) {
        console.log(`   ❌ 생성 실패: ${createError.message}`)
        errors++
        continue
      }

      const userId = userData.user?.id
      console.log(`   ✅ 계정 생성: ${account.email}`)

      if (profile) {
        // 기존 프로필 업데이트 (user_id 연결)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            id: userId,
            email: account.email,
            role: 'vip'
          })
          .eq('nickname', account.nickname)

        if (updateError) {
          console.log(`   ⚠️  프로필 업데이트 실패: ${updateError.message}`)
        } else {
          console.log(`   🔗 기존 프로필 연결됨`)
          updated++
        }
      } else {
        // 새 프로필 생성
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            nickname: account.nickname,
            email: account.email,
            role: 'vip'
          })

        if (insertError) {
          console.log(`   ⚠️  프로필 생성 실패: ${insertError.message}`)
        } else {
          console.log(`   📝 새 프로필 생성됨`)
        }
      }

      created++

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))

    } catch (err: any) {
      console.log(`   ❌ 오류: ${err.message}`)
      errors++
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 결과 요약')
  console.log(`   생성: ${created}개`)
  console.log(`   업데이트: ${updated}개`)
  console.log(`   스킵: ${skipped}개`)
  console.log(`   오류: ${errors}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (dryRun) {
    console.log('\n💡 실제 생성하려면: npx tsx scripts/create-vip-accounts.ts')
  }
}

main().catch(console.error)
