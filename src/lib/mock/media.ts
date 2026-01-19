/**
 * Mock Media Content Data
 * Shorts & VOD - 콘텐츠가 준비되면 여기에 추가
 */

import type { MediaContent } from '@/types/database'

// ============================================
// Shorts 콘텐츠 - 현재 비어있음
// ============================================
const baseShorts: MediaContent[] = []

// ============================================
// VOD 콘텐츠 - 현재 비어있음
// ============================================
const baseVods: MediaContent[] = []

// ============================================
// Export
// ============================================
export const mockMediaContent: MediaContent[] = [
  ...baseShorts,
  ...baseVods,
]
