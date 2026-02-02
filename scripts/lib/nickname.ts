/**
 * 닉네임 정규화 유틸리티
 *
 * 기능:
 * - 다양한 형식에서 닉네임 추출
 * - 유니코드 정규화 (NFC)
 * - 공백/특수문자 정리
 *
 * 사용법:
 *   import { extractNickname, normalizeNickname } from './lib/nickname'
 *
 *   const nickname = extractNickname('user123(미키™)')
 *   const normalized = normalizeNickname(nickname)
 */

/**
 * 아이디(닉네임) 형식에서 닉네임만 추출
 *
 * 지원 형식:
 * - "아이디(닉네임)" → "닉네임"
 * - "닉네임" → "닉네임" (괄호 없으면 그대로)
 * - "아이디 (닉네임)" → "닉네임" (공백 포함)
 *
 * @example
 * extractNickname('user123(미키™)') // '미키™'
 * extractNickname('미키™') // '미키™'
 * extractNickname('user123 (미키™)') // '미키™'
 */
export function extractNickname(idWithNickname: string): string {
  const trimmed = idWithNickname.trim()

  // 형식: 아이디(닉네임) 또는 아이디 (닉네임)
  const match = trimmed.match(/\(([^)]+)\)\s*$/)
  if (match) {
    return match[1].trim()
  }

  // 괄호가 없으면 전체를 닉네임으로 간주
  return trimmed
}

/**
 * 유니코드 정규화 (NFC 형식)
 *
 * 같은 문자의 다른 유니코드 표현을 통일
 * - NFD: 분해 형식 (한글 자모 분리)
 * - NFC: 조합 형식 (한글 완성형)
 *
 * @example
 * // '가' 문자의 두 가지 표현을 통일
 * normalizeUnicode('\u1100\u1161') // '가' (조합형)
 */
export function normalizeUnicode(str: string): string {
  return str.normalize('NFC')
}

/**
 * 공백 정리 (연속 공백 → 단일 공백, 앞뒤 공백 제거)
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim()
}

/**
 * 불필요한 문자 제거 (제어 문자, Zero-width 문자 등)
 */
export function removeControlCharacters(str: string): string {
  // Zero-width characters, control characters 제거
  return str.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
}

/**
 * 전체 닉네임 정규화
 *
 * 1. 유니코드 정규화 (NFC)
 * 2. 제어 문자 제거
 * 3. 공백 정리
 *
 * @example
 * normalizeNickname('  미키™  ') // '미키™'
 */
export function normalizeNickname(nickname: string): string {
  let result = nickname

  // 1. 유니코드 정규화
  result = normalizeUnicode(result)

  // 2. 제어 문자 제거
  result = removeControlCharacters(result)

  // 3. 공백 정리
  result = normalizeWhitespace(result)

  return result
}

/**
 * 닉네임 추출 + 정규화 (한 번에)
 *
 * @example
 * processNickname('user123(  미키™  )') // '미키™'
 */
export function processNickname(idWithNickname: string): string {
  const extracted = extractNickname(idWithNickname)
  return normalizeNickname(extracted)
}

/**
 * 시스템 닉네임 여부 확인
 * (랭킹 집계에서 제외해야 하는 닉네임)
 */
export function isSystemNickname(nickname: string): boolean {
  const systemPatterns = [
    'RG_family',
    '대표BJ',
    '운영자',
    'SYSTEM',
    'system',
    '관리자',
    'admin',
    'Admin',
  ]

  return systemPatterns.some(
    (pattern) => nickname.includes(pattern) || nickname.toLowerCase() === pattern.toLowerCase()
  )
}

/**
 * 닉네임 유사도 비교 (Levenshtein distance 기반)
 * 오타나 닉네임 변경 감지에 사용
 *
 * @returns 0~1 사이 유사도 (1이 완전 일치)
 */
export function nicknameSimilarity(a: string, b: string): number {
  const normA = normalizeNickname(a)
  const normB = normalizeNickname(b)

  if (normA === normB) return 1

  const distance = levenshteinDistance(normA, normB)
  const maxLength = Math.max(normA.length, normB.length)

  return maxLength === 0 ? 1 : 1 - distance / maxLength
}

/**
 * Levenshtein 거리 계산
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 대체
          matrix[i][j - 1] + 1, // 삽입
          matrix[i - 1][j] + 1 // 삭제
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// CLI 테스트 지원
if (require.main === module) {
  console.log('📋 닉네임 유틸리티 테스트\n')

  // extractNickname 테스트
  console.log('=== extractNickname 테스트 ===')
  const extractTests = [
    'user123(미키™)',
    '미키™',
    'user123 (미키™)',
    '[RG]미드굿(닉네임)',
    '그냥닉네임',
  ]

  for (const test of extractTests) {
    console.log(`입력: "${test}" → 결과: "${extractNickname(test)}"`)
  }

  // normalizeNickname 테스트
  console.log('\n=== normalizeNickname 테스트 ===')
  const normalizeTests = ['  미키™  ', '미키\u200B™', '미  키™']

  for (const test of normalizeTests) {
    const hexCodes = [...test].map((c) => c.charCodeAt(0).toString(16)).join(' ')
    console.log(`입력: [${hexCodes}] → 결과: "${normalizeNickname(test)}"`)
  }

  // isSystemNickname 테스트
  console.log('\n=== isSystemNickname 테스트 ===')
  const systemTests = ['RG_family', '미키™', '대표BJ리나', '일반닉네임']

  for (const test of systemTests) {
    console.log(`"${test}" → ${isSystemNickname(test) ? '시스템' : '일반'}`)
  }

  // 유사도 테스트
  console.log('\n=== nicknameSimilarity 테스트 ===')
  const similarityTests: [string, string][] = [
    ['미키™', '미키™'],
    ['미키', '미키™'],
    ['Mickey', 'Micky'],
    ['완전다름', 'ABCD'],
  ]

  for (const [a, b] of similarityTests) {
    const sim = nicknameSimilarity(a, b)
    console.log(`"${a}" vs "${b}" → ${(sim * 100).toFixed(1)}%`)
  }

  console.log('\n✅ 테스트 완료!')
}
