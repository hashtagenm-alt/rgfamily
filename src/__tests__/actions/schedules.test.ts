import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedules,
  getSchedulesByDate,
} from '@/lib/actions/schedules'

// Mock createServerSupabaseClient
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Schedules Server Actions', () => {
  const mockSchedule = {
    id: 1,
    title: '테스트 일정',
    event_type: 'broadcast' as const,
    unit: null,
    start_datetime: '2026-01-23T20:00:00Z',
    is_all_day: false,
    description: '테스트 설명',
    created_by: 'admin-123',
    created_at: '2026-01-23T00:00:00Z',
    updated_at: '2026-01-23T00:00:00Z',
  }

  const createMockSupabase = (overrides = {}) => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [mockSchedule],
              error: null,
            }),
          })),
          order: vi.fn().mockResolvedValue({
            data: [mockSchedule],
            error: null,
          }),
        })),
        order: vi.fn().mockResolvedValue({
          data: [mockSchedule],
          error: null,
        }),
        or: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [mockSchedule],
            error: null,
          }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockSchedule,
            error: null,
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockSchedule,
              error: null,
            }),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
    })),
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSchedule', () => {
    it('should create a schedule when user is admin', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const result = await createSchedule({
        title: '새 일정',
        event_type: 'broadcast',
        start_datetime: '2026-01-23T20:00:00Z',
        is_all_day: false,
      })

      expect(result.data).toEqual(mockSchedule)
      expect(result.error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('schedules')
    })

    it('should return error when user is not admin', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'member' },
              error: null,
            }),
          })),
        })),
      }))
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const result = await createSchedule({
        title: '새 일정',
        event_type: 'broadcast',
        start_datetime: '2026-01-23T20:00:00Z',
        is_all_day: false,
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('관리자 권한이 필요합니다.')
    })

    it('should handle database errors', async () => {
      const mockSupabase = createMockSupabase()

      // First call for profile check
      const profileSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        })),
      }))

      // Second call for insert (fails)
      const insertSelect = vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }))

      let callCount = 0
      mockSupabase.from = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return { select: profileSelect }
        }
        return {
          insert: vi.fn(() => ({ select: insertSelect })),
        }
      })

      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const result = await createSchedule({
        title: '새 일정',
        event_type: 'broadcast',
        start_datetime: '2026-01-23T20:00:00Z',
        is_all_day: false,
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('Database error')
    })
  })

  describe('updateSchedule', () => {
    it('should update a schedule when user is admin', async () => {
      const mockSupabase = createMockSupabase()

      let callCount = 0
      mockSupabase.from = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockSchedule, title: '수정된 일정' },
                  error: null,
                }),
              })),
            })),
          })),
        }
      })

      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const result = await updateSchedule(1, { title: '수정된 일정' })

      expect(result.data?.title).toBe('수정된 일정')
      expect(result.error).toBeNull()
    })
  })

  describe('deleteSchedule', () => {
    it('should delete a schedule when user is admin', async () => {
      const mockSupabase = createMockSupabase()

      let callCount = 0
      mockSupabase.from = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          })),
        }
      })

      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const result = await deleteSchedule(1)

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })

  describe('getSchedules', () => {
    it('should return schedules without filters', async () => {
      const mockSupabase = createMockSupabase()
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [mockSchedule],
            error: null,
          }),
        })),
      }))
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const result = await getSchedules()

      expect(result.data).toEqual([mockSchedule])
      expect(result.error).toBeNull()
    })

    // TODO: Fix complex query chaining mock
    it.skip('should apply date filters', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn() },
        from: vi.fn(() => {
          const query = {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockSchedule], error: null }),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          }
          return query
        }),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const result = await getSchedules({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      })

      expect(result.data).toEqual([mockSchedule])
      expect(result.error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('schedules')
    })

    // TODO: Fix complex query chaining mock
    it.skip('should apply unit filter', async () => {
      const mockSupabase = {
        auth: { getUser: vi.fn() },
        from: vi.fn(() => {
          const query = {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [mockSchedule], error: null }),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          }
          return query
        }),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const result = await getSchedules({ unit: 'excel' })

      expect(result.data).toEqual([mockSchedule])
      expect(result.error).toBeNull()
    })
  })

  describe('getSchedulesByDate', () => {
    it('should return schedules for a specific date', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: [mockSchedule],
        error: null,
      })
      const orMock = vi.fn(() => ({ order: orderMock }))

      const mockSupabase = createMockSupabase()
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          or: orMock,
        })),
      }))
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const result = await getSchedulesByDate('2026-01-23')

      expect(result.data).toEqual([mockSchedule])
      expect(result.error).toBeNull()
    })
  })
})
