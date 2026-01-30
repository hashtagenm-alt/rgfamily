/**
 * bj_ranks 테이블 생성 및 초기 데이터 삽입 스크립트
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
  auth: { persistSession: false },
})

// 초기 직급 데이터
const initialRanks = [
  { name: '여왕', level: 1, display_order: 1, color: '#FFD700', description: '최고 직급 - 시즌 1등' },
  { name: '공주', level: 2, display_order: 2, color: '#FFC0CB', description: '2등 직급' },
  { name: '황족', level: 3, display_order: 3, color: '#9400D3', description: '3등 직급' },
  { name: '귀족', level: 4, display_order: 4, color: '#4169E1', description: '4등 직급' },
  { name: '시녀장', level: 5, display_order: 5, color: '#228B22', description: '5등 직급' },
  { name: '시녀', level: 6, display_order: 6, color: '#32CD32', description: '6등 직급' },
  { name: '하녀1', level: 7, display_order: 7, color: '#808080', description: '7등 직급' },
  { name: '하녀2', level: 8, display_order: 8, color: '#A9A9A9', description: '8등 직급' },
  { name: '하녀3', level: 9, display_order: 9, color: '#C0C0C0', description: '9등 직급' },
  { name: '노예장', level: 10, display_order: 10, color: '#8B4513', description: '10등 직급' },
  { name: '노예', level: 11, display_order: 11, color: '#A0522D', description: '11등 직급' },
  { name: '쌉노예', level: 12, display_order: 12, color: '#D2691E', description: '최하위 직급' },
]

async function main() {
  console.log('🚀 bj_ranks 테이블 생성 및 초기 데이터 삽입 시작\n')

  // 1. 먼저 테이블이 존재하는지 확인
  const { data: existingRanks, error: checkError } = await supabase
    .from('bj_ranks')
    .select('id')
    .limit(1)

  if (checkError) {
    console.log('⚠️ bj_ranks 테이블이 존재하지 않습니다.')
    console.log('   Supabase Dashboard에서 먼저 테이블을 생성해주세요.\n')
    console.log('📋 생성해야 할 SQL:')
    console.log(`
CREATE TABLE bj_ranks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE,
  level INTEGER NOT NULL,
  display_order INTEGER NOT NULL,
  color VARCHAR(7),
  icon_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`)
    return
  }

  console.log('✅ bj_ranks 테이블이 존재합니다.')

  // 2. 기존 데이터 확인
  const { count } = await supabase
    .from('bj_ranks')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    console.log(`📊 이미 ${count}개의 직급 데이터가 있습니다.`)

    // 기존 데이터 표시
    const { data: ranks } = await supabase
      .from('bj_ranks')
      .select('*')
      .order('level', { ascending: true })

    console.log('\n현재 직급 목록:')
    ranks?.forEach(r => {
      console.log(`   Lv.${r.level} ${r.name} (${r.color})`)
    })
    return
  }

  // 3. 초기 데이터 삽입
  console.log('📝 초기 직급 데이터 삽입 중...')

  const { data, error } = await supabase
    .from('bj_ranks')
    .insert(initialRanks)
    .select()

  if (error) {
    console.error('❌ 데이터 삽입 실패:', error.message)
    return
  }

  console.log(`✅ ${data.length}개의 직급 데이터 삽입 완료!`)

  // 삽입된 데이터 표시
  console.log('\n삽입된 직급 목록:')
  data.forEach(r => {
    console.log(`   Lv.${r.level} ${r.name} (${r.color})`)
  })
}

main().catch(console.error)
