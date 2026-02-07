/**
 * 에피소드별 donations 데이터 정합성 확인
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function checkEpisodes() {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 에피소드별 donations 데이터 확인')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 에피소드 정보 조회
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number, title, total_hearts, donor_count')
    .eq('season_id', 1)
    .order('episode_number', { ascending: true })

  let totalHearts = 0
  const episodeDetails: any[] = []

  for (const ep of episodes || []) {
    // donations 실제 집계
    const { data: donations } = await supabase
      .from('donations')
      .select('amount')
      .eq('episode_id', ep.id)

    const actualTotal = donations?.reduce((sum, d) => sum + d.amount, 0) || 0
    totalHearts += actualTotal

    const match = actualTotal === (ep.total_hearts || 0)
    const status = match ? '✅' : '⚠️'

    episodeDetails.push({
      number: ep.episode_number,
      title: ep.title,
      tableHearts: ep.total_hearts || 0,
      actualHearts: actualTotal,
      donationCount: donations?.length || 0,
      match
    })

    console.log(`${status} EP ${ep.episode_number}: ${ep.title}`)
    console.log(`   에피소드 테이블: ${(ep.total_hearts || 0).toLocaleString()} 하트`)
    console.log(`   donations 집계: ${actualTotal.toLocaleString()} 하트 (${donations?.length || 0}건)`)

    if (!match && ep.total_hearts) {
      const diff = Math.abs(actualTotal - ep.total_hearts)
      console.log(`   ⚠️ 차이: ${diff.toLocaleString()} 하트`)
    }
    console.log('')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 시즌 1 전체 donations 합계: ${totalHearts.toLocaleString()} 하트`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 주요 후원자별 집계
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 주요 후원자별 donations 집계 (Top 10)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  const { data: allDonations } = await supabase
    .from('donations')
    .select('donor_name, amount')
    .eq('season_id', 1)
    .gt('amount', 0)

  // 후원자별 집계
  const donorMap = new Map<string, number>()
  for (const d of allDonations || []) {
    const current = donorMap.get(d.donor_name) || 0
    donorMap.set(d.donor_name, current + d.amount)
  }

  // 정렬
  const sorted = Array.from(donorMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  sorted.slice(0, 10).forEach((d, i) => {
    console.log(`   ${i + 1}위: ${d.name} - ${d.amount.toLocaleString()} 하트`)
  })

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

checkEpisodes().catch(console.error)
