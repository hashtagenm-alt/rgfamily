/**
 * RFC 4180 준수 CSV 파서
 *
 * 기능:
 * - 따옴표 내 쉼표 처리
 * - 이스케이프된 따옴표 처리 ("")
 * - BOM 자동 제거
 * - 다양한 줄바꿈 형식 지원 (CRLF, LF, CR)
 *
 * 사용법:
 *   import { parseCSV, parseCSVLine } from './lib/csv-parser'
 *
 *   const records = parseCSV(content)
 *   const fields = parseCSVLine(line)
 */

/**
 * CSV 라인을 파싱하여 필드 배열 반환
 * RFC 4180 준수 (따옴표 내 쉼표, 이스케이프된 따옴표 처리)
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // 다음 문자도 "이면 이스케이프된 따옴표
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        } else {
          // 따옴표 끝
          inQuotes = false
          i++
          continue
        }
      } else {
        current += char
        i++
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }
  }

  // 마지막 필드 추가
  result.push(current.trim())

  return result
}

/**
 * BOM(Byte Order Mark) 제거
 */
export function removeBOM(content: string): string {
  // UTF-8 BOM: EF BB BF (U+FEFF)
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1)
  }
  return content
}

/**
 * 줄바꿈 정규화 (CRLF, CR → LF)
 */
export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export interface ParseCSVOptions {
  /** 첫 번째 행을 헤더로 사용 (기본값: true) */
  hasHeader?: boolean
  /** 빈 행 건너뛰기 (기본값: true) */
  skipEmptyRows?: boolean
  /** 주석 행 접두사 (기본값: null) */
  commentPrefix?: string | null
  /** BOM 제거 (기본값: true) */
  removeBOM?: boolean
}

export interface ParsedCSV<T = Record<string, string>> {
  headers: string[]
  records: T[]
  rawRows: string[][]
}

/**
 * CSV 내용 전체 파싱
 */
export function parseCSV<T = Record<string, string>>(
  content: string,
  options: ParseCSVOptions = {}
): ParsedCSV<T> {
  const {
    hasHeader = true,
    skipEmptyRows = true,
    commentPrefix = null,
    removeBOM: shouldRemoveBOM = true,
  } = options

  // 전처리
  let processed = content
  if (shouldRemoveBOM) {
    processed = removeBOM(processed)
  }
  processed = normalizeLineEndings(processed)

  // 줄 분리
  const lines = processed.split('\n')

  // 파싱
  const rawRows: string[][] = []
  for (const line of lines) {
    const trimmed = line.trim()

    // 빈 줄 건너뛰기
    if (skipEmptyRows && trimmed.length === 0) {
      continue
    }

    // 주석 건너뛰기
    if (commentPrefix && trimmed.startsWith(commentPrefix)) {
      continue
    }

    rawRows.push(parseCSVLine(trimmed))
  }

  // 헤더 처리
  let headers: string[] = []
  let dataRows = rawRows

  if (hasHeader && rawRows.length > 0) {
    headers = rawRows[0]
    dataRows = rawRows.slice(1)
  }

  // 레코드 변환
  const records = dataRows.map((row) => {
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = row[index] || ''
    })
    return record as T
  })

  return { headers, records, rawRows: dataRows }
}

/**
 * 간단한 CSV 파싱 (헤더 없이 2D 배열로 반환)
 */
export function parseCSVSimple(content: string): string[][] {
  const { rawRows } = parseCSV(content, { hasHeader: false })
  return rawRows
}

/**
 * PandaTV 후원 CSV 형식 파싱
 * 형식: 순위, 아이디(닉네임), 하트수
 */
export interface PandaTVDonation {
  rank: number
  id: string
  nickname: string
  hearts: number
}

export function parsePandaTVDonationCSV(content: string): PandaTVDonation[] {
  const rows = parseCSVSimple(content)
  const donations: PandaTVDonation[] = []

  // 첫 번째 행은 헤더 (건너뛰기)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 3) continue

    const rankStr = row[0]
    const idWithNickname = row[1]
    const heartsStr = row[2]

    // 순위 파싱
    const rank = parseInt(rankStr.replace(/,/g, ''), 10)
    if (isNaN(rank)) continue

    // 아이디/닉네임 분리: "아이디(닉네임)" 형식
    const match = idWithNickname.match(/^([^(]+)(?:\(([^)]+)\))?$/)
    const id = match ? match[1].trim() : idWithNickname.trim()
    const nickname = match && match[2] ? match[2].trim() : id

    // 하트 수 파싱
    const hearts = parseInt(heartsStr.replace(/,/g, ''), 10)
    if (isNaN(hearts) || hearts <= 0) continue

    donations.push({ rank, id, nickname, hearts })
  }

  return donations
}

// CLI 테스트 지원
if (require.main === module) {
  console.log('📋 CSV Parser 테스트\n')

  // 테스트 케이스
  const testCases = [
    // 기본 케이스
    'a,b,c',
    // 따옴표 포함
    '"hello, world",foo,bar',
    // 이스케이프된 따옴표
    '"He said ""Hello""",test,123',
    // 한글 포함
    '1,미키™(닉네임),1000',
    // 복잡한 닉네임
    '1,"[RG]미드굿♣️가애(닉네임)",2000',
  ]

  console.log('=== parseCSVLine 테스트 ===')
  for (const testCase of testCases) {
    console.log(`입력: ${testCase}`)
    console.log(`결과: ${JSON.stringify(parseCSVLine(testCase))}`)
    console.log()
  }

  console.log('=== PandaTV 형식 테스트 ===')
  const pandaCSV = `순위,아이디(닉네임),하트
1,user1(미키™),10000
2,user2(손밍매니아),5000
3,"user3([RG]미드굿♣️가애)",3000`

  const parsed = parsePandaTVDonationCSV(pandaCSV)
  console.log('파싱 결과:', JSON.stringify(parsed, null, 2))

  console.log('\n✅ 테스트 완료!')
}
