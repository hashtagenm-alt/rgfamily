/**
 * BJ 계정 이메일/비밀번호 업데이트
 *
 * 이메일: {pandatvId}@rgfamily.kr (pandatv.kr 제거)
 * 비밀번호: rg{숫자4자리}! (아이디와 다르게)
 *
 * 사용법: npx tsx scripts/update-bj-accounts.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// 간단한 비밀번호 생성 (아이디와 다르게)
function generateSimplePassword(): string {
  const num = Math.floor(1000 + Math.random() * 9000) // 1000-9999
  return `rg${num}!`
}

interface BjAccount {
  nickname: string
  email: string
  password: string
  role: string
  pandatvId: string
}

async function main() {
  console.log('🔄 BJ 계정 업데이트 시작...\n')

  const accounts: BjAccount[] = []

  // BJ 목록 조회
  const { data: bjMembers, error } = await supabase
    .from('organization')
    .select('name, profile_id, social_links, role')
    .eq('is_active', true)
    .not('profile_id', 'is', null)
    .order('position_order')

  if (error) {
    console.error('❌ BJ 조회 실패:', error.message)
    return
  }

  console.log(`📋 BJ ${bjMembers?.length || 0}명 업데이트\n`)

  for (const bj of bjMembers || []) {
    const pandatvId = (bj.social_links as { pandatv?: string })?.pandatv || ''
    const isRep = bj.role === '대표'

    // 새 이메일: pandatvId@rgfamily.kr
    const newEmail = `${pandatvId}@rgfamily.kr`

    // 새 비밀번호: rg + 4자리 숫자 + ! (아이디와 다르게)
    const newPassword = generateSimplePassword()

    // Auth 업데이트
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      bj.profile_id,
      {
        email: newEmail,
        password: newPassword,
        email_confirm: true
      }
    )

    if (updateError) {
      console.log(`  ⚠️  ${bj.name}: 업데이트 실패 - ${updateError.message}`)
      continue
    }

    // 프로필 이메일도 업데이트
    await supabase
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', bj.profile_id)

    accounts.push({
      nickname: bj.name,
      email: newEmail,
      password: newPassword,
      role: isRep ? 'admin' : 'member',
      pandatvId: pandatvId,
    })

    console.log(`  ✅ ${bj.name}`)
    console.log(`     이메일: ${newEmail}`)
    console.log(`     비밀번호: ${newPassword}`)
  }

  // CSV 저장
  const csvLines = ['닉네임,아이디(이메일),비밀번호,권한']
  for (const acc of accounts) {
    csvLines.push(`${acc.nickname},${acc.email},${acc.password},${acc.role}`)
  }

  const outputPath = path.join(process.cwd(), 'data', 'bj-accounts-final.csv')
  fs.writeFileSync(outputPath, '\ufeff' + csvLines.join('\n'), 'utf-8')

  console.log(`\n✅ 완료! CSV 저장됨: ${outputPath}`)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 최종 계정 정보:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(csvLines.join('\n'))
}

main().catch(console.error)
