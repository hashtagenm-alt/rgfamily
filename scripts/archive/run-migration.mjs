/**
 * VIP 자동화 마이그레이션 실행 스크립트
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// .env.local 로드
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 VIP 자동화 마이그레이션 시작...\n')

  try {
    // 1. episodes 테이블에 is_finalized 컬럼 확인
    console.log('1. episodes 테이블에 is_finalized 컬럼 확인...')
    const { data: checkCol1 } = await supabase
      .from('episodes')
      .select('is_finalized')
      .limit(1)

    if (checkCol1 !== null) {
      console.log('   ✅ is_finalized 컬럼 존재 확인')
    } else {
      console.log('   ⚠️ is_finalized 컬럼 확인 필요 - Supabase 대시보드에서 직접 추가하세요')
    }

    // 2. episodes 테이블에 finalized_at 컬럼 추가
    console.log('2. episodes 테이블에 finalized_at 컬럼 추가...')
    const { data: checkCol2 } = await supabase
      .from('episodes')
      .select('finalized_at')
      .limit(1)

    if (checkCol2 !== null) {
      console.log('   ✅ finalized_at 컬럼 존재 확인')
    } else {
      console.log('   ⚠️ finalized_at 컬럼 확인 필요 - Supabase 대시보드에서 직접 추가하세요')
    }

    // 3. vip_rewards 테이블에 episode_id 컬럼 추가
    console.log('3. vip_rewards 테이블에 episode_id 컬럼 추가...')
    const { data: checkCol3 } = await supabase
      .from('vip_rewards')
      .select('episode_id')
      .limit(1)

    if (checkCol3 !== null) {
      console.log('   ✅ episode_id 컬럼 존재 확인')
    } else {
      console.log('   ⚠️ episode_id 컬럼 확인 필요 - Supabase 대시보드에서 직접 추가하세요')
    }

    // 4. 현재 에피소드 데이터 확인
    console.log('\n4. 현재 에피소드 데이터 확인...')
    const { data: episodes, error: epError } = await supabase
      .from('episodes')
      .select('id, title, is_rank_battle, is_finalized')
      .order('id', { ascending: true })
      .limit(10)

    if (epError) {
      console.log('   ❌ 에피소드 조회 실패:', epError.message)
    } else {
      console.log(`   ✅ ${episodes?.length || 0}개 에피소드 확인`)
      if (episodes && episodes.length > 0) {
        console.log('   에피소드 목록:')
        episodes.forEach(ep => {
          const status = ep.is_rank_battle ? '🏆 직급전' : '📺 일반'
          const finalized = ep.is_finalized ? '✅ 확정' : '⏳ 미확정'
          console.log(`     - [${ep.id}] ${ep.title} (${status}, ${finalized})`)
        })
      }
    }

    // 5. 현재 VIP 보상 데이터 확인
    console.log('\n5. 현재 VIP 보상 데이터 확인...')
    const { data: rewards, error: rwError } = await supabase
      .from('vip_rewards')
      .select('id, rank, episode_id')
      .order('id', { ascending: true })
      .limit(10)

    if (rwError) {
      console.log('   ❌ VIP 보상 조회 실패:', rwError.message)
    } else {
      console.log(`   ✅ ${rewards?.length || 0}개 VIP 보상 확인`)
    }

    console.log('\n✨ 마이그레이션 확인 완료!')
    console.log('\n📝 컬럼이 없다면 Supabase 대시보드 > SQL Editor에서 아래 SQL을 실행하세요:')
    console.log(`
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;
ALTER TABLE vip_rewards ADD COLUMN IF NOT EXISTS episode_id INT REFERENCES episodes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_vip_rewards_episode ON vip_rewards(episode_id);
CREATE INDEX IF NOT EXISTS idx_episodes_is_finalized ON episodes(is_finalized);
    `)

  } catch (err) {
    console.error('❌ 마이그레이션 실패:', err)
    process.exit(1)
  }
}

runMigration()
