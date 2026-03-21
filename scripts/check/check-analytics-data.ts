import { getServiceClient } from '../lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function main() {
  // 전체 donations (시즌 1)
  const { data: all } = await supabase
    .from('donations')
    .select('amount, target_bj')
    .eq('season_id', 1)

  const totalAll = all?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0
  const withBj = all?.filter(d => d.target_bj !== null && d.target_bj !== undefined) || []
  const withoutBj = all?.filter(d => d.target_bj === null || d.target_bj === undefined) || []

  const totalWithBj = withBj.reduce((sum, d) => sum + (d.amount || 0), 0)
  const totalWithoutBj = withoutBj.reduce((sum, d) => sum + (d.amount || 0), 0)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 시즌 1 후원 데이터 분석')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📌 전체 donations:')
  console.log(`   총 건수: ${all?.length || 0}건`)
  console.log(`   총 하트: ${totalAll.toLocaleString()} 하트`)

  console.log('\n📌 target_bj 있는 데이터 (분석탭 기준):')
  console.log(`   건수: ${withBj.length}건`)
  console.log(`   하트: ${totalWithBj.toLocaleString()} 하트`)

  console.log('\n📌 target_bj 없는 데이터:')
  console.log(`   건수: ${withoutBj.length}건`)
  console.log(`   하트: ${totalWithoutBj.toLocaleString()} 하트`)

  // 에피소드별 확인
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 에피소드별 데이터')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const episodes = [
    { id: 14, name: '3화' },
    { id: 15, name: '4화' },
    { id: 16, name: '5화' }
  ]

  for (const ep of episodes) {
    const { data: epData } = await supabase
      .from('donations')
      .select('amount, target_bj')
      .eq('episode_id', ep.id)

    const total = epData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0
    const epWithBj = epData?.filter(d => d.target_bj !== null && d.target_bj !== undefined) || []
    const epWithoutBj = epData?.filter(d => d.target_bj === null || d.target_bj === undefined) || []

    console.log(`${ep.name} (id:${ep.id}):`)
    console.log(`   총: ${epData?.length}건, ${total.toLocaleString()} 하트`)
    console.log(`   BJ있음: ${epWithBj.length}건 (${epWithBj.reduce((s, d) => s + (d.amount || 0), 0).toLocaleString()} 하트)`)
    console.log(`   BJ없음: ${epWithoutBj.length}건 (${epWithoutBj.reduce((s, d) => s + (d.amount || 0), 0).toLocaleString()} 하트)\n`)
  }
}

main().catch(console.error)
