/**
 * Mock Data Utilities
 * 프리미엄 플레이스홀더 이미지 및 헬퍼 함수
 *
 * @description Mock 데이터 생성에 사용되는 유틸리티 함수들
 * @module lib/utils/mock
 */

// ============================================
// Avatar Generators
// ============================================

/**
 * UI Avatars - 깔끔한 이니셜 기반 아바타
 * 브랜드 컬러 기반 그라디언트 배경
 */
export const getPlaceholderAvatar = (seed: string): string => {
  const colors = ['52525b', '71717a', '3f3f46', '27272a', '18181b']
  const bgColor = colors[seed.length % colors.length]
  const name = seed.replace(/[^a-zA-Z가-힣]/g, '').slice(0, 2).toUpperCase() || 'RG'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=ffffff&size=200&font-size=0.4&bold=true`
}

/**
 * 실제 여성 인물 사진 (Unsplash)
 * 멤버 프로필용 - 바스트샷 스타일
 */
const femalePortraits = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face&q=80', // 1
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face&q=80', // 2
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face&q=80', // 3
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face&q=80', // 4
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face&q=80', // 5
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face&q=80', // 6
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face&q=80', // 7
  'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=400&fit=crop&crop=face&q=80', // 8
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face&q=80', // 9
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face&q=80', // 10
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face&q=80', // 11
  'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=400&h=400&fit=crop&crop=face&q=80', // 12
  'https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=400&h=400&fit=crop&crop=face&q=80', // 13
  'https://images.unsplash.com/photo-1464863979621-258859e62245?w=400&h=400&fit=crop&crop=face&q=80', // 14
]

export const getMemberAvatar = (seed: string): string => {
  // seed 문자열의 해시값을 기반으로 일관된 이미지 선택
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return femalePortraits[hash % femalePortraits.length]
}

/**
 * DiceBear Shapes - 추상적 기하학 패턴
 * VIP/프리미엄 프로필용
 */
export const getVipAvatar = (seed: string): string =>
  `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}&backgroundColor=52525b,71717a,3f3f46&size=200`

// ============================================
// Thumbnail Generators
// ============================================

/**
 * Unsplash 고품질 썸네일
 * 카테고리별 이미지 생성
 */
export const getUnsplashThumbnail = (
  category: 'gaming' | 'music' | 'stream' | 'event' | 'portrait' | 'abstract',
  id: number
): string => {
  const queries: Record<string, string[]> = {
    gaming: ['gaming-setup', 'neon-gaming', 'esports', 'game-controller', 'rgb-lights'],
    music: ['concert-lights', 'music-studio', 'microphone', 'karaoke', 'singer'],
    stream: ['live-stream', 'broadcasting', 'studio-lights', 'content-creator', 'webcam'],
    event: ['celebration', 'party-lights', 'confetti', 'event', 'gathering'],
    portrait: ['portrait-light', 'silhouette', 'profile-photo', 'headshot', 'person'],
    abstract: ['abstract-neon', 'gradient', 'particles', 'waves', 'geometric'],
  }
  const query = queries[category][id % queries[category].length]
  return `https://source.unsplash.com/640x360/?${query}&sig=${id}`
}

/**
 * Picsum 랜덤 이미지 (빠른 로딩)
 */
export const getPicsumThumbnail = (id: number, width = 640, height = 360): string =>
  `https://picsum.photos/seed/${id}/${width}/${height}`

/**
 * 그라디언트 메쉬 배경 (Placehold.co)
 */
export const getGradientPlaceholder = (
  text: string,
  colors: [string, string] = ['52525b', '18181b'],
  size: [number, number] = [600, 400]
): string =>
  `https://placehold.co/${size[0]}x${size[1]}/${colors[0]}/${colors[1]}?text=${encodeURIComponent(text)}&font=roboto`

// ============================================
// Character/Banner Images
// ============================================

/**
 * DiceBear Lorelei - 캐릭터 일러스트 (배너용)
 * 더 세련된 설정으로 업데이트
 */
export const getMemberCharacterImage = (seed: string): string =>
  `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundColor=transparent&size=400`

/**
 * 배너용 추상 아트 배경
 */
export const getBannerBackground = (id: number): string => {
  const patterns = [
    'linear-gradient(135deg, #52525b 0%, #18181b 50%, #000 100%)',
    'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #000 100%)',
    'linear-gradient(135deg, #4a1c6b 0%, #1a0a2e 50%, #000 100%)',
    'linear-gradient(135deg, #2d1810 0%, #1a0a05 50%, #000 100%)',
  ]
  return patterns[id % patterns.length]
}

// ============================================
// Timeline Images
// ============================================

/**
 * 타임라인 이벤트 이미지
 */
export const getTimelinePlaceholder = (text: string, color: string = '52525b'): string =>
  `https://placehold.co/600x400/${color}/ffffff?text=${encodeURIComponent(text)}&font=roboto`

// ============================================
// Date Utilities
// ============================================

/**
 * 날짜 오프셋 헬퍼 (스케줄용)
 */
export const getDateWithOffset = (daysOffset: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString()
}

/**
 * 현재 ISO 타임스탬프
 */
export const getCurrentTimestamp = (): string => new Date().toISOString()
