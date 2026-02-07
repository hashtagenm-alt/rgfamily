import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = getServiceClient()

const accounts = [
  { name: '린아', email: 'qwerdf1101@rgfamily.kr' },
  { name: '설윤', email: 'xxchosun@rgfamily.kr' },
  { name: '가애', email: 'acron5@rgfamily.kr' },
  { name: '채은', email: 'hj042300@rgfamily.kr' },
  { name: '가윤', email: 'juuni9613@rgfamily.kr' },
  { name: '홍서하', email: 'lrsehwa@rgfamily.kr' },
  { name: '월아', email: 'goldmoon04@rgfamily.kr' },
  { name: '한백설', email: 'firstaplus121@rgfamily.kr' },
  { name: '퀸로니', email: 'tjdrks1771@rgfamily.kr' },
  { name: '해린', email: 'qwerty3490@rgfamily.kr' },
  { name: '한세아', email: 'kkrinaa@rgfamily.kr' },
  { name: '청아', email: 'mandoooo@rgfamily.kr' },
  { name: '키키', email: 'kiki0213@rgfamily.kr' },
]

async function check() {
  console.log('=== BJ 계정 검증 ===')
  console.log('멤버명     | 이메일                      | DB존재 | organization연결')
  console.log('-'.repeat(80))

  for (const acc of accounts) {
    // 프로필 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, role')
      .eq('email', acc.email)
      .single()

    if (!profile) {
      console.log(`${acc.name.padEnd(8)} | ${acc.email.padEnd(27)} | ❌ 없음 | -`)
      continue
    }

    // organization 연결 확인
    const { data: org } = await supabase
      .from('organization')
      .select('name')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .single()

    const dbStatus = '✅ 있음'
    const orgStatus = org ? `✅ ${org.name}` : '❌ 미연결'

    console.log(`${acc.name.padEnd(8)} | ${acc.email.padEnd(27)} | ${dbStatus} | ${orgStatus}`)
  }
}

check().catch(console.error)
