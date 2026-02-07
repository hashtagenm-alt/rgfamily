import { getServiceClient } from './lib/supabase'
/**
 * 2차 직급전 마이그레이션 스크립트
 *
 * 작업 내용:
 * 1. 기존 1차 공약을 pledge_history에 백업
 * 2. 새 2차 공약으로 position_pledge 업데이트
 * 3. 멤버별 직급 변경 (current_rank, current_rank_id)
 * 4. 손밍 is_active 활성화
 */

const supabase = getServiceClient()

// 2차 직급전 결과 (멤버명 → 새 직급)
const BATTLE2_RANKS: Record<string, { rank_name: string; rank_id: number }> = {
  '청아': { rank_name: '여왕', rank_id: 1 },
  '채은': { rank_name: '공주', rank_id: 2 },
  '손밍': { rank_name: '황족', rank_id: 3 },
  '가윤': { rank_name: '귀족', rank_id: 4 },
  '홍서하': { rank_name: '시녀장', rank_id: 5 },
  '한세아': { rank_name: '시녀', rank_id: 6 },
  '해린': { rank_name: '하녀1', rank_id: 7 },
  '퀸로니': { rank_name: '하녀2', rank_id: 8 },
  '설윤': { rank_name: '하녀3', rank_id: 9 },
  '한백설': { rank_name: '노예장', rank_id: 10 },
  '월아': { rank_name: '노예', rank_id: 11 },
}

// 2차 직급전 공통 공약 (모든 멤버 동일)
const BATTLE2_PLEDGE = `[1등] 여왕 ▶ 커스텀마이크+대표합방권
[2등] 공주 ▶ 퇴근전쟁 면제권
[3등] 황족 ▶ 늦출(1시30분까지)
[4등] 귀족 ▶ 벌칙 1회 면제권
[5등] 시녀장 ▶ 아래 직급 전체 소환권(+야방포함)
[6등] 시녀 ▶ 알지패밀리 공홈 홍보방송하기 (회원가입 3명시키고, 자유게시판에서 인증받기)
[7등] 하녀1 ▶ 출근방송 (30분)
[8등] 하녀2 ▶ 출근방송 (30분)
[9등] 하녀3 ▶ 출근방송 (30분)
[10등] 노예장 ▶ 엑셀스튜디오 청소 방송 (폰야방필수)
[11등] 노예 ▶ 폭죽채우기+청소`

async function migrate() {
  console.log('🚀 2차 직급전 마이그레이션 시작...\n')

  // 1. 대상 멤버 조회 (대표 제외)
  const { data: members, error: fetchError } = await supabase
    .from('organization')
    .select('id, name, profile_info, current_rank, current_rank_id, is_active')
    .in('name', Object.keys(BATTLE2_RANKS))

  if (fetchError) {
    console.error('❌ 멤버 조회 실패:', fetchError)
    return
  }

  console.log(`📋 대상 멤버 ${members?.length}명 조회됨\n`)

  // 2. 각 멤버별 업데이트
  for (const member of members || []) {
    const newRank = BATTLE2_RANKS[member.name]
    if (!newRank) continue

    const existingProfileInfo = member.profile_info || {}
    const existingPledge = existingProfileInfo.position_pledge

    // pledge_history 구성
    const pledgeHistory = existingProfileInfo.pledge_history || []

    // 1차 공약이 있고, 아직 히스토리에 없으면 백업
    if (existingPledge && !pledgeHistory.some((h: { battle_number: number }) => h.battle_number === 1)) {
      pledgeHistory.push({
        battle_number: 1,
        season_id: 1,
        pledge_text: existingPledge,
        created_at: new Date().toISOString()
      })
    }

    // 2차 공약 히스토리 추가
    if (!pledgeHistory.some((h: { battle_number: number }) => h.battle_number === 2)) {
      pledgeHistory.push({
        battle_number: 2,
        season_id: 1,
        pledge_text: BATTLE2_PLEDGE,
        created_at: new Date().toISOString()
      })
    }

    // 새 profile_info 구성
    const newProfileInfo = {
      ...existingProfileInfo,
      position_pledge: BATTLE2_PLEDGE,  // 현재 표시용 = 2차 공약
      pledge_history: pledgeHistory
    }

    // 업데이트 실행
    const updateData: Record<string, unknown> = {
      profile_info: newProfileInfo,
      current_rank: newRank.rank_name,
      current_rank_id: newRank.rank_id
    }

    // 손밍은 is_active도 true로
    if (member.name === '손밍') {
      updateData.is_active = true
    }

    const { error: updateError } = await supabase
      .from('organization')
      .update(updateData)
      .eq('id', member.id)

    if (updateError) {
      console.error(`❌ ${member.name} 업데이트 실패:`, updateError)
    } else {
      const rankChange = member.current_rank !== newRank.rank_name
        ? `${member.current_rank || '없음'} → ${newRank.rank_name}`
        : `${newRank.rank_name} (유지)`

      console.log(`✅ ${member.name}: ${rankChange}`)
      if (member.name === '손밍') {
        console.log(`   └─ is_active: false → true (복귀)`)
      }
    }
  }

  console.log('\n✨ 마이그레이션 완료!')
  console.log('─'.repeat(50))

  // 3. 결과 확인
  const { data: result } = await supabase
    .from('organization')
    .select('name, current_rank, current_rank_id, is_active')
    .in('name', Object.keys(BATTLE2_RANKS))
    .order('current_rank_id', { ascending: true })

  console.log('\n📊 2차 직급전 결과:')
  result?.forEach((m, i) => {
    const emoji = ['👑', '👸', '🏰', '🎩', '💼', '👗', '🧹', '🧹', '🧹', '⛓️', '⛓️'][i] || ''
    console.log(`  ${i + 1}. ${emoji} ${m.current_rank} - ${m.name}${m.is_active ? '' : ' (비활성)'}`)
  })
}

migrate().catch(console.error)
