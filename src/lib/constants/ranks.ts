/**
 * RG Family 직급전 계급 시스템
 *
 * 직급전에서 BJ들의 후원 순위에 따라 부여되는 계급
 * 1위(여왕)부터 12위(쌉노예)까지 12단계
 */

export interface Rank {
  position: number
  name: string
  emoji: string
  tier: 'royal' | 'noble' | 'servant' | 'slave'
  color: string
}

export const RANKS: Rank[] = [
  { position: 1, name: '여왕', emoji: '👑', tier: 'royal', color: '#ffd700' },
  { position: 2, name: '공주', emoji: '👸', tier: 'royal', color: '#ff69b4' },
  { position: 3, name: '황족', emoji: '🏰', tier: 'royal', color: '#9370db' },
  { position: 4, name: '귀족', emoji: '🎩', tier: 'noble', color: '#4169e1' },
  { position: 5, name: '시녀장', emoji: '💼', tier: 'noble', color: '#20b2aa' },
  { position: 6, name: '시녀', emoji: '👗', tier: 'noble', color: '#3cb371' },
  { position: 7, name: '하녀1', emoji: '🧹', tier: 'servant', color: '#cd853f' },
  { position: 8, name: '하녀2', emoji: '🧹', tier: 'servant', color: '#d2691e' },
  { position: 9, name: '하녀3', emoji: '🧹', tier: 'servant', color: '#a0522d' },
  { position: 10, name: '노예장', emoji: '⛓️', tier: 'slave', color: '#696969' },
  { position: 11, name: '노예', emoji: '⛓️', tier: 'slave', color: '#505050' },
  { position: 12, name: '쌉노예', emoji: '💀', tier: 'slave', color: '#363636' },
]

/**
 * 순위로 직급 조회
 */
export function getRankByPosition(position: number): Rank | null {
  return RANKS.find((r) => r.position === position) || null
}

/**
 * 직급명으로 조회
 */
export function getRankByName(name: string): Rank | null {
  return RANKS.find((r) => r.name === name) || null
}

/**
 * 순위에 해당하는 직급명 반환
 */
export function getRankName(position: number): string {
  const rank = getRankByPosition(position)
  return rank ? rank.name : `${position}위`
}

/**
 * 순위에 해당하는 이모지 반환
 */
export function getRankEmoji(position: number): string {
  const rank = getRankByPosition(position)
  return rank?.emoji || '🏅'
}

/**
 * 직급 티어 (그룹) 조회
 * - royal: 여왕, 공주, 황족 (1-3위)
 * - noble: 귀족, 시녀장, 시녀 (4-6위)
 * - servant: 하녀1,2,3 (7-9위)
 * - slave: 노예장, 노예, 쌉노예 (10-12위)
 */
export function getRankTier(position: number): Rank['tier'] | null {
  const rank = getRankByPosition(position)
  return rank?.tier || null
}

/**
 * 직급 색상 조회
 */
export function getRankColor(position: number): string {
  const rank = getRankByPosition(position)
  return rank?.color || '#888888'
}

/**
 * 직급 표시 문자열 (이모지 + 이름)
 */
export function getRankDisplay(position: number): string {
  const rank = getRankByPosition(position)
  if (!rank) return `${position}위`
  return `${rank.emoji} ${rank.name}`
}

/**
 * VIP Top 3 여부 (royal 티어)
 */
export function isVipRank(position: number): boolean {
  return position >= 1 && position <= 3
}

/**
 * 총 직급 수
 */
export const TOTAL_RANKS = RANKS.length
