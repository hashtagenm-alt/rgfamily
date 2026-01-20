/**
 * Mock Seasons Data
 * 시즌 정보
 */

import type { Season } from '@/types/database'

export const mockSeasons: Season[] = [
  {
    id: 1,
    name: '시즌 1',
    start_date: '2025-01-01',
    end_date: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
]
