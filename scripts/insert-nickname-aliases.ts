/**
 * nickname_aliases 초기 데이터 삽입 스크립트
 *
 * 사전 조건: nickname_aliases 테이블이 생성되어 있어야 함
 * 테이블 생성: scripts/sql/create-nickname-aliases.sql
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// 동일인물 닉네임 매핑 데이터
const nicknameAliases = [
  // 채은❤️여신 (까부는김회장) - profile_id: 09ef14ad-9cee-44a2-9440-8cbd575084f2
  {
    profile_id: '09ef14ad-9cee-44a2-9440-8cbd575084f2',
    nicknames: [
      { nickname: '채은❤️여신', is_primary: true },
      { nickname: '서연❤️까부는김회장', is_primary: false },
      { nickname: '까부는김회장', is_primary: false },
      { nickname: '채은❤️까부는김회장', is_primary: false },
    ]
  },
  // 젖문가 변형들 - profile_id: 1312dbb6-fc23-4f6a-a5cb-696695be039c
  {
    profile_id: '1312dbb6-fc23-4f6a-a5cb-696695be039c',
    nicknames: [
      { nickname: '[J]젖문가', is_primary: true },
      { nickname: '[A]젖문가', is_primary: false },
    ]
  },
  // 린아의발굴 변형들 - profile_id: 3e413632-32a6-486a-86e8-f5cedf3030b3
  {
    profile_id: '3e413632-32a6-486a-86e8-f5cedf3030b3',
    nicknames: [
      { nickname: '[RG]✨린아의발굴™✨', is_primary: true },
      { nickname: '[RG]✨린아의발굴™', is_primary: false },
    ]
  },
]

async function main() {
  console.log('🔧 nickname_aliases 데이터 삽입 시작...\n')

  // 테이블 존재 확인
  const { error: checkError } = await supabase
    .from('nickname_aliases')
    .select('id')
    .limit(1)

  if (checkError) {
    console.error('❌ nickname_aliases 테이블이 존재하지 않습니다.')
    console.error('   먼저 scripts/sql/create-nickname-aliases.sql을 실행하세요.')
    console.error('   Supabase Dashboard SQL Editor에서 실행할 수 있습니다.')
    process.exit(1)
  }

  // 기존 데이터 삭제 옵션
  const args = process.argv.slice(2)
  if (args.includes('--reset')) {
    console.log('🗑️ 기존 데이터 삭제 중...')
    await supabase.from('nickname_aliases').delete().neq('id', 0)
  }

  // 데이터 삽입
  for (const aliasGroup of nicknameAliases) {
    console.log(`\n👤 프로필 ${aliasGroup.profile_id} 닉네임 매핑:`)

    for (const alias of aliasGroup.nicknames) {
      const { error } = await supabase
        .from('nickname_aliases')
        .upsert({
          profile_id: aliasGroup.profile_id,
          nickname: alias.nickname,
          is_primary: alias.is_primary,
        }, {
          onConflict: 'nickname'
        })

      if (error) {
        console.error(`  ❌ ${alias.nickname}: ${error.message}`)
      } else {
        const primaryMark = alias.is_primary ? '(대표)' : ''
        console.log(`  ✅ ${alias.nickname} ${primaryMark}`)
      }
    }
  }

  // 결과 확인
  console.log('\n📊 삽입된 데이터 확인:')
  const { data: result } = await supabase
    .from('nickname_aliases')
    .select('profile_id, nickname, is_primary')
    .order('profile_id')

  if (result) {
    let currentProfile = ''
    for (const row of result) {
      if (row.profile_id !== currentProfile) {
        currentProfile = row.profile_id
        console.log(`\n  📌 ${row.profile_id}:`)
      }
      const mark = row.is_primary ? '⭐' : '  '
      console.log(`    ${mark} ${row.nickname}`)
    }
  }

  console.log('\n✅ nickname_aliases 데이터 삽입 완료!')
}

main().catch(console.error)
