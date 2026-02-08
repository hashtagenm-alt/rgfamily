/**
 * PandaTV 후원 내역 CSV 파싱 유틸리티 (클라이언트/서버 공용)
 */

// 필터링할 닉네임 패턴
const EXCLUDED_NAMES = ['RG_family', 'RG_Family', 'rg_family', '대표BJ']

interface ParsedDonation {
  donated_at: string | null
  donor_name: string
  amount: number
  target_bj: string | null
}

interface CsvParseResult {
  rows: ParsedDonation[]
  totalHearts: number
  uniqueDonors: number
  top5: Array<{ donor_name: string; total: number }>
}

/**
 * BJ명 정제: 대괄호 제거 + 접미사(직급 등) 제거
 */
function cleanBjName(raw: string): string {
  return raw
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s*\((여왕|왕|공주|퇴근|조퇴|방장|매니저|열혈팬|우수팬|신규팬|대표BJ)\)\s*/g, '')
    .trim()
}

/**
 * 닉네임 추출: "아이디(닉네임)" → "닉네임"
 */
function extractNickname(raw: string): string {
  const match = raw.match(/\(([^)]+)\)/)
  if (match) return match[1].trim()
  return raw.trim()
}

/**
 * CSV 텍스트를 파싱하여 후원 내역 배열로 변환
 * 형식: "후원시간, 후원아이디(닉네임), 후원하트, 참여BJ"
 */
export function parseDonationCsv(csvText: string): CsvParseResult {
  // BOM 제거
  const text = csvText.replace(/^\uFEFF/, '')
  const lines = text.trim().split('\n')
  if (lines.length < 2) {
    return { rows: [], totalHearts: 0, uniqueDonors: 0, top5: [] }
  }

  const rows: ParsedDonation[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(',').map(p => p.trim())
    if (parts.length < 3) continue

    const donatedAt = parts[0] || null
    const donorRaw = parts[1] || ''
    const amount = parseInt(parts[2]?.replace(/,/g, '') || '0', 10)
    const targetBjRaw = parts[3] || ''

    const donorName = extractNickname(donorRaw)
    const targetBj = targetBjRaw ? cleanBjName(targetBjRaw) : null

    if (!donorName || amount <= 0) continue
    if (EXCLUDED_NAMES.some(name => donorName.toLowerCase().includes(name.toLowerCase()))) continue

    rows.push({ donated_at: donatedAt, donor_name: donorName, amount, target_bj: targetBj })
  }

  const totalHearts = rows.reduce((sum, r) => sum + r.amount, 0)
  const donorMap: Record<string, number> = {}
  for (const r of rows) {
    donorMap[r.donor_name] = (donorMap[r.donor_name] || 0) + r.amount
  }
  const uniqueDonors = Object.keys(donorMap).length
  const top5 = Object.entries(donorMap)
    .map(([donor_name, total]) => ({ donor_name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return { rows, totalHearts, uniqueDonors, top5 }
}
