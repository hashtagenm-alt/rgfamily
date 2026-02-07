import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = getServiceClient()

async function main() {
  // VIP 역할을 가진 프로필 조회
  const { data: vipProfiles, count } = await supabase
    .from('profiles')
    .select('nickname, email, role, account_type', { count: 'exact' })
    .eq('role', 'vip')
    .order('nickname')

  console.log('=== VIP 계정 현황 ===')
  console.log(`총 VIP 계정: ${count}개\n`)

  console.log('닉네임'.padEnd(30) + '이메일'.padEnd(40) + '계정타입')
  console.log('-'.repeat(85))

  const realAccounts: any[] = []
  const virtualAccounts: any[] = []

  vipProfiles?.forEach(p => {
    if (p.account_type === 'real') {
      realAccounts.push(p)
    } else {
      virtualAccounts.push(p)
    }
  })

  console.log('\n[실제 로그인 가능 계정]')
  realAccounts.forEach(p => {
    const nick = (p.nickname || '').slice(0, 28).padEnd(30)
    const email = (p.email || '').slice(0, 38).padEnd(40)
    console.log(`${nick}${email}${p.account_type || 'unknown'}`)
  })

  console.log(`\n실제 계정: ${realAccounts.length}개`)
  console.log(`가상 계정: ${virtualAccounts.length}개`)
}

main().catch(console.error)
