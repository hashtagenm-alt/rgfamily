/**
 * BJ 비밀번호 간단하게 재설정
 *
 * 비밀번호 형식: bj{PandaTV ID 앞4자리}!
 * 예: qwerdf1101 → bjqwer!
 *
 * 사용법: npx tsx scripts/reset-bj-passwords.ts
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

interface BjAccount {
  nickname: string
  email: string
  password: string
  role: string
  pandatvId: string
}

async function main() {
  console.log('🔑 BJ 비밀번호 재설정 시작...\n')

  const accounts: BjAccount[] = []

  // BJ 목록 조회 (profile_id가 있는 것만)
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

  console.log(`📋 BJ ${bjMembers?.length || 0}명 비밀번호 재설정\n`)

  for (const bj of bjMembers || []) {
    const pandatvId = (bj.social_links as { pandatv?: string })?.pandatv || ''
    const isRep = bj.role === '대표'

    // 간단한 비밀번호: bj + pandatv ID 앞4자리 + !
    // 예: qwerdf1101 → bjqwer!
    const prefix = pandatvId.slice(0, 4).toLowerCase()
    const simplePassword = `bj${prefix}!`

    // Auth 비밀번호 업데이트
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      bj.profile_id,
      { password: simplePassword }
    )

    if (updateError) {
      console.log(`  ⚠️  ${bj.name}: 비밀번호 업데이트 실패 - ${updateError.message}`)
      continue
    }

    const email = pandatvId ? `${pandatvId}@pandatv.kr` : `bj.${bj.name}@rgfamily.kr`

    accounts.push({
      nickname: bj.name,
      email: email,
      password: simplePassword,
      role: isRep ? 'admin' : 'member',
      pandatvId: pandatvId,
    })

    console.log(`  ✅ ${bj.name}: ${simplePassword}`)
  }

  // CSV 저장
  const csvLines = ['닉네임,이메일,비밀번호,권한,PandaTV_ID']
  for (const acc of accounts) {
    csvLines.push(`${acc.nickname},${acc.email},${acc.password},${acc.role},${acc.pandatvId}`)
  }

  const outputPath = path.join(process.cwd(), 'data', 'bj-accounts-simple.csv')
  fs.writeFileSync(outputPath, '\ufeff' + csvLines.join('\n'), 'utf-8')

  console.log(`\n✅ 완료! CSV 저장됨: ${outputPath}`)
  console.log('\n📋 계정 정보:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(csvLines.join('\n'))
}

main().catch(console.error)
