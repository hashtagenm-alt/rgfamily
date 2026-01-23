import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminAction, authAction, publicAction } from '@/lib/actions'

// Mock createServerSupabaseClient
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Server Action Wrappers', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
  })

  describe('adminAction', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const result = await adminAction(async () => 'success')

      expect(result.data).toBeNull()
      expect(result.error).toBe('로그인이 필요합니다.')
    })

    it('should return error when user profile not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found' },
            }),
          }),
        }),
      })

      const result = await adminAction(async () => 'success')

      expect(result.data).toBeNull()
      expect(result.error).toBe('프로필을 찾을 수 없습니다.')
    })

    it('should return error when user is not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'member' },
              error: null,
            }),
          }),
        }),
      })

      const result = await adminAction(async () => 'success')

      expect(result.data).toBeNull()
      expect(result.error).toBe('관리자 권한이 필요합니다.')
    })

    it('should execute action when user is admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      })

      const result = await adminAction(async () => ({ id: 1, name: 'test' }))

      expect(result.data).toEqual({ id: 1, name: 'test' })
      expect(result.error).toBeNull()
    })

    it('should execute action when user is superadmin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'superadmin-123' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'superadmin' },
              error: null,
            }),
          }),
        }),
      })

      const result = await adminAction(async () => 'superadmin action')

      expect(result.data).toBe('superadmin action')
      expect(result.error).toBeNull()
    })

    it('should catch and return action errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      })

      const result = await adminAction(async () => {
        throw new Error('Database connection failed')
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('Database connection failed')
    })
  })

  describe('authAction', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const result = await authAction(async () => 'success')

      expect(result.data).toBeNull()
      expect(result.error).toBe('로그인이 필요합니다.')
    })

    it('should execute action and pass userId when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockAction = vi.fn().mockResolvedValue({ userId: 'user-123', data: 'test' })
      const result = await authAction(mockAction)

      expect(mockAction).toHaveBeenCalledWith(mockSupabase, 'user-123')
      expect(result.data).toEqual({ userId: 'user-123', data: 'test' })
      expect(result.error).toBeNull()
    })

    it('should catch and return action errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const result = await authAction(async () => {
        throw new Error('Action failed')
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('Action failed')
    })
  })

  describe('publicAction', () => {
    it('should execute action without authentication', async () => {
      const result = await publicAction(async () => [1, 2, 3])

      expect(result.data).toEqual([1, 2, 3])
      expect(result.error).toBeNull()
    })

    it('should catch and return action errors', async () => {
      const result = await publicAction(async () => {
        throw new Error('Public action failed')
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('Public action failed')
    })

    it('should handle non-Error throws', async () => {
      const result = await publicAction(async () => {
        throw 'string error'
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('알 수 없는 오류가 발생했습니다.')
    })
  })
})
