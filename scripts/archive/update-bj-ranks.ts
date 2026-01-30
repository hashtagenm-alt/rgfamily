/**
 * bj_ranks 테이블에 emoji, tier 컬럼 추가 및 데이터 업데이트
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

// ranks.ts와 동일한 데이터
const rankData = [
  { level: 1, emoji: '👑', tier: 'royal', color: '#ffd700' },
  { level: 2, emoji: '👸', tier: 'royal', color: '#ff69b4' },
  { level: 3, emoji: '🏰', tier: 'royal', color: '#9370db' },
  { level: 4, emoji: '🎩', tier: 'noble', color: '#4169e1' },
  { level: 5, emoji: '💼', tier: 'noble', color: '#20b2aa' },
  { level: 6, emoji: '👗', tier: 'noble', color: '#3cb371' },
  { level: 7, emoji: '🧹', tier: 'servant', color: '#cd853f' },
  { level: 8, emoji: '🧹', tier: 'servant', color: '#d2691e' },
  { level: 9, emoji: '🧹', tier: 'servant', color: '#a0522d' },
  { level: 10, emoji: '⛓️', tier: 'slave', color: '#696969' },
  { level: 11, emoji: '⛓️', tier: 'slave', color: '#505050' },
  { level: 12, emoji: '💀', tier: 'slave', color: '#363636' },
]

async function main() {
  console.log('🚀 bj_ranks 테이블 업데이트 시작\n')

  // 1. 현재 테이블 구조 확인
  const { data: currentRanks, error: checkError } = await supabase
    .from('bj_ranks')
    .select('*')
    .order('level', { ascending: true })

  if (checkError) {
    console.error('❌ bj_ranks 테이블 조회 실패:', checkError.message)
    return
  }

  console.log('📋 현재 bj_ranks 데이터:')
  currentRanks?.forEach(r => {
    console.log(`   Lv.${r.level} ${r.name} - emoji: ${r.emoji || '(없음)'}, tier: ${r.tier || '(없음)'}`)
  })

  // 2. 각 직급에 emoji, tier, color 업데이트
  console.log('\n📝 emoji, tier, color 업데이트 중...')

  for (const rank of rankData) {
    const { error } = await supabase
      .from('bj_ranks')
      .update({
        emoji: rank.emoji,
        tier: rank.tier,
        color: rank.color,
      })
      .eq('level', rank.level)

    if (error) {
      console.error(`   ❌ Lv.${rank.level} 업데이트 실패:`, error.message)
    } else {
      console.log(`   ✅ Lv.${rank.level} ${rank.emoji} ${rank.tier} 업데이트 완료`)
    }
  }

  // 3. 결과 확인
  console.log('\n📊 업데이트 후 결과:')
  const { data: updatedRanks } = await supabase
    .from('bj_ranks')
    .select('*')
    .order('level', { ascending: true })

  updatedRanks?.forEach(r => {
    console.log(`   Lv.${r.level} ${r.name} ${r.emoji || ''} [${r.tier}] (${r.color})`)
  })

  console.log('\n✅ 완료!')
}

main().catch(console.error)
