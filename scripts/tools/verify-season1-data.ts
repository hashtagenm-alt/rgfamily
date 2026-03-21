/**
 * 시즌 1 후원내역 CSV 데이터와 DB 데이터 정합성 확인
 */

import { getServiceClient } from '../lib/supabase'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const supabase = getServiceClient()

const csvFolder = '/Users/bagjaeseog/Downloads/RG 엑셀 시즌1 후원내역'

// CSV 파일 파싱
// 형식: 후원시간,후원 아이디(닉네임),후원하트,참여BJ,하트점수,기여도,기타
function parseCSV(content: string): { donor_name: string; amount: number }[] {
  const lines = content.trim().split('\n')
  const data: { donor_name: string; amount: number }[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(',')
    if (parts.length < 3) continue

    // 두 번째 컬럼: 아이디(닉네임) 형식에서 닉네임 추출
    const idNickname = parts[1].trim()
    const nicknameMatch = idNickname.match(/\((.+)\)/)
    const donorName = nicknameMatch ? nicknameMatch[1] : idNickname

    // 세 번째 컬럼: 후원하트
    const amountStr = parts[2].trim().replace(/,/g, '')
    const amount = parseInt(amountStr, 10)

    if (donorName && !isNaN(amount) && amount > 0) {
      data.push({ donor_name: donorName, amount })
    }
  }

  return data
}

async function verifyEpisode(episodeNum: number, csvFiles: string[]) {
  // CSV 파일 읽기
  const csvData: { donor_name: string; amount: number }[] = []

  for (const csvFile of csvFiles) {
    const filePath = path.join(csvFolder, csvFile)
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️ 파일 없음: ${csvFile}`)
      continue
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const parsed = parseCSV(content)
    csvData.push(...parsed)
  }

  const csvTotal = csvData.reduce((sum, d) => sum + d.amount, 0)
  const csvCount = csvData.length

  // 후원자별 합산
  const csvDonorMap = new Map<string, number>()
  for (const d of csvData) {
    csvDonorMap.set(d.donor_name, (csvDonorMap.get(d.donor_name) || 0) + d.amount)
  }

  // DB 데이터 조회
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number, title, total_hearts')
    .eq('season_id', 1)
    .eq('episode_number', episodeNum)
    .single()

  if (!episodes) {
    console.log(`   ⚠️ 에피소드 ${episodeNum} DB 없음`)
    return
  }

  const { data: donations } = await supabase
    .from('donations')
    .select('donor_name, amount')
    .eq('episode_id', episodes.id)

  const dbTotal = donations?.reduce((sum, d) => sum + d.amount, 0) || 0
  const dbCount = donations?.length || 0

  // 후원자별 합산
  const dbDonorMap = new Map<string, number>()
  for (const d of donations || []) {
    dbDonorMap.set(d.donor_name, (dbDonorMap.get(d.donor_name) || 0) + d.amount)
  }

  // 비교
  const totalMatch = csvTotal === dbTotal
  const countMatch = csvCount === dbCount
  const status = totalMatch && countMatch ? '✅' : '⚠️'

  console.log(`${status} EP ${episodeNum}: ${episodes.title}`)
  console.log(`   CSV: ${csvTotal.toLocaleString()} 하트 (${csvCount}건)`)
  console.log(`   DB:  ${dbTotal.toLocaleString()} 하트 (${dbCount}건)`)

  if (!totalMatch) {
    const diff = Math.abs(csvTotal - dbTotal)
    console.log(`   💥 차이: ${diff.toLocaleString()} 하트`)
  }

  if (!countMatch) {
    const diff = Math.abs(csvCount - dbCount)
    console.log(`   💥 건수 차이: ${diff}건`)
  }

  // 후원자별 차이 확인 (상위 5명만)
  if (!totalMatch) {
    console.log('   📊 주요 차이:')
    const allDonors = new Set([...csvDonorMap.keys(), ...dbDonorMap.keys()])
    const diffs: { name: string; csv: number; db: number; diff: number }[] = []

    for (const donor of allDonors) {
      const csvAmount = csvDonorMap.get(donor) || 0
      const dbAmount = dbDonorMap.get(donor) || 0
      if (csvAmount !== dbAmount) {
        diffs.push({ name: donor, csv: csvAmount, db: dbAmount, diff: csvAmount - dbAmount })
      }
    }

    diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    diffs.slice(0, 5).forEach((d) => {
      console.log(`      ${d.name}: CSV ${d.csv.toLocaleString()} vs DB ${d.db.toLocaleString()} (차이: ${d.diff.toLocaleString()})`)
    })
  }

  console.log('')
}

async function main() {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 시즌 1 후원내역 CSV vs DB 정합성 확인')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  await verifyEpisode(1, ['1회차 후원내역.csv'])
  await verifyEpisode(2, ['2회차 후원내역.csv'])
  await verifyEpisode(3, ['3회차 후원내역.csv'])
  await verifyEpisode(4, ['4회차 후원내역.csv', '4회차 후원내역2.csv', '4회차 후원내역3.csv'])
  await verifyEpisode(5, ['5회차 후원내역.csv'])
  await verifyEpisode(6, ['6회차 후원내역.csv'])
  await verifyEpisode(7, ['7회차 후원내역.csv'])

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 정합성 확인 완료')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
}

main().catch(console.error)
