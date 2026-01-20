/**
 * URL-safe Hash Utilities
 *
 * userId를 해시로 변환하여 URL에서 사용자 ID 노출을 방지
 * - 양방향 인코딩 (encode/decode)
 * - Base64 URL-safe 변환
 */

// 간단한 XOR 기반 난독화 키 (실제 프로덕션에서는 환경변수로)
const HASH_KEY = 'rgfamily2024secret'

/**
 * userId를 해시 문자열로 변환
 * @param userId - Supabase user UUID
 * @returns URL-safe hash string
 */
export function encodeUserIdToHash(userId: string): string {
  // XOR 난독화
  const xorResult = userId
    .split('')
    .map((char, i) => {
      const keyChar = HASH_KEY[i % HASH_KEY.length]
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0))
    })
    .join('')

  // Base64 URL-safe 인코딩
  const base64 = btoa(xorResult)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return base64
}

/**
 * 해시 문자열을 userId로 복원
 * @param hash - URL-safe hash string
 * @returns userId or null if invalid
 */
export function decodeHashToUserId(hash: string): string | null {
  try {
    // Base64 URL-safe 디코딩
    const base64 = hash
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    // 패딩 추가
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    )

    const xorResult = atob(paddedBase64)

    // XOR 복원
    const userId = xorResult
      .split('')
      .map((char, i) => {
        const keyChar = HASH_KEY[i % HASH_KEY.length]
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0))
      })
      .join('')

    // ID 형식 검증 (mock 데이터 user-1 형식도 허용)
    // UUID: 36자, Mock ID: user-1 ~ user-50 형식 (5~8자)
    if (userId.length < 5) {
      return null
    }

    return userId
  } catch {
    return null
  }
}

/**
 * Tribute 페이지 URL 생성
 * @param userId - Supabase user UUID
 * @returns /ranking/tribute/[hash] 형식 URL
 */
export function getTributePageUrl(userId: string): string {
  const hash = encodeUserIdToHash(userId)
  return `/ranking/tribute/${hash}`
}
