/**
 * CSV 파일에서 후원자 랭킹 추출 스크립트
 */

import * as fs from 'fs'
import * as path from 'path'

interface DonorData {
  nickname: string
  totalHearts: number
  donationCount: number
}

function parseCSV(filePath: string): DonorData[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').slice(1) // skip header

  const donorMap = new Map<string, DonorData>()

  for (const line of lines) {
    if (!line.trim()) continue

    // CSV 파싱 (쉼표로 분리, 따옴표 처리)
    const match = line.match(/^([^,]+),([^,]+)\(([^)]+)\),(\d+),/)
    if (!match) continue

    const nickname = match[3]
    const hearts = parseInt(match[4], 10)

    if (donorMap.has(nickname)) {
      const existing = donorMap.get(nickname)!
      existing.totalHearts += hearts
      existing.donationCount += 1
    } else {
      donorMap.set(nickname, {
        nickname,
        totalHearts: hearts,
        donationCount: 1
      })
    }
  }

  // 정렬
  const sorted = Array.from(donorMap.values())
    .sort((a, b) => b.totalHearts - a.totalHearts)

  return sorted
}

const files = [
  { name: '1회 (1/21)', path: '/Users/bagjaeseog/Downloads/후원기록/RG패밀리 엑셀부 시즌_내역_2026012517.csv' },
  { name: '4회 (1/28)', path: '/Users/bagjaeseog/Downloads/RG패밀리 엑셀부 시즌_내역_2026012805.csv' },
  { name: '5회 (1/30)', path: '/Users/bagjaeseog/Downloads/RG패밀리 엑셀부 시즌_내역_2026013002.csv' },
  { name: '6회 (2/1)', path: '/Users/bagjaeseog/Downloads/RG패밀리 엑셀부 시즌_내역_2026020103.csv' },
]

console.log('=== 에피소드별 후원자 랭킹 (Top 20) ===\n')

for (const file of files) {
  if (!fs.existsSync(file.path)) {
    console.log(`${file.name}: 파일 없음`)
    continue
  }

  console.log(`\n📊 ${file.name}`)
  console.log('─'.repeat(50))

  const rankings = parseCSV(file.path)
  rankings.slice(0, 20).forEach((d, i) => {
    console.log(`${(i + 1).toString().padStart(2)}위: ${d.nickname} - ${d.totalHearts.toLocaleString()} 하트 (${d.donationCount}회)`)
  })
}
