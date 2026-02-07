/**
 * 레거시 데이터 재계산
 * 화면 총합 - donations(시즌1) = 레거시
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

// 화면 데이터 (레거시 + 시즌 1)
const screenData = [
  { name: '르큐리', total: 1798059 },
  { name: '미키™', total: 981100 },
  { name: '채은❤️여신', total: 716532 },
  { name: '에이맨♣️', total: 665664 },
  { name: '손밍매니아', total: 559434 },
  { name: '[J]젖문가', total: 416691 },
  { name: '한세아내꺼♡호랭이', total: 337117 },
  { name: '❥CaNnOt', total: 296395 },
  { name: '[RG]미드굿♣️가애', total: 286662 },
  { name: '사랑해씌발™', total: 260217 },
  { name: '[RG]✨린아의발굴™✨', total: 240333 },
  { name: '시아에오ღ까부는넌내꺼야', total: 209322 },
  { name: '쩔어서짜다', total: 185465 },
  { name: '바겐시우', total: 160436 },
  { name: '린아사단✨탱커', total: 148415 },
  { name: '[RG]가애ෆ57774', total: 147072 },
  { name: '박하은❤️린아❤️사탕', total: 142253 },
  { name: 'qldh라유', total: 99880 },
  { name: '신세련❤️영원한니꺼✦쿨', total: 97525 },
  { name: '김스껄', total: 95115 },
]

async function recalculate() {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 donations 테이블 전체 재집계')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 전체 donations 조회
  const { data: allDonations } = await supabase
    .from('donations')
    .select('donor_name, amount')
    .eq('season_id', 1)

  // 후원자별 집계
  const donorMap = new Map<string, number>()
  for (const d of allDonations || []) {
    const current = donorMap.get(d.donor_name) || 0
    donorMap.set(d.donor_name, current + d.amount)
  }

  console.log('📋 화면 Top 20과 donations 비교:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  const legacyData: Record<string, number> = {}
  let allMatch = true

  for (const screen of screenData) {
    const seasonTotal = donorMap.get(screen.name) || 0
    const legacy = screen.total - seasonTotal

    const match = screen.total === seasonTotal
    const status = match ? '✅' : legacy > 0 ? '📊' : '⚠️'

    console.log(`${status} ${screen.name}:`)
    console.log(`   화면: ${screen.total.toLocaleString()}`)
    console.log(`   시즌1: ${seasonTotal.toLocaleString()}`)
    console.log(`   레거시: ${legacy.toLocaleString()}`)

    if (legacy > 0) {
      legacyData[screen.name] = legacy
      allMatch = false
    } else if (legacy < 0) {
      console.log(`   ⚠️ 오류: 시즌1이 화면보다 ${Math.abs(legacy).toLocaleString()} 더 많음!`)
      allMatch = false
    }
    console.log('')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (allMatch) {
    console.log('✅ 모든 데이터 일치! 레거시 없음')
  } else {
    console.log('📋 legacyData (레거시가 있는 후원자만):')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('const legacyData: Record<string, number> = {')
    for (const [name, amount] of Object.entries(legacyData)) {
      console.log(`  '${name}': ${amount},`)
    }
    console.log('}')
  }
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

recalculate().catch(console.error)
