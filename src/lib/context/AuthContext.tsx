'use client'

/**
 * Auth Context
 *
 * 전역 인증 상태 관리
 * - 사용자 세션/프로필 공유
 * - 권한 체크 헬퍼
 * - 로그인/로그아웃 액션
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import { User, Session, AuthError, AuthResponse } from '@supabase/supabase-js'
import { useSupabaseContext } from './SupabaseContext'
import { logger } from '@/lib/utils/logger'
import { VIP_ROLES, ADMIN_ROLES, MODERATOR_ROLES } from '@/lib/constants/roles'
import type { Profile, Role } from '@/types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthActions {
  signIn: (
    email: string,
    password: string
  ) => Promise<{ data: AuthResponse['data']; error: AuthError | null }>
  signUp: (
    email: string,
    password: string,
    nickname: string
  ) => Promise<{ data: AuthResponse['data']; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
  hasRole: (roles: Role | Role[]) => boolean
  isAdmin: () => boolean
  isModerator: () => boolean
  isVip: () => boolean
}

type AuthContextType = AuthState & AuthActions

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabaseContext()
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      return data
    },
    [supabase]
  )

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({
          user: session.user,
          profile,
          session,
          isLoading: false,
          isAuthenticated: true,
        })
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    initAuth()

    // 주의: onAuthStateChange 콜백은 반드시 동기 함수여야 함
    // async 콜백 사용 시 Supabase 내부 잠금 메커니즘과 충돌하여 교착 상태 발생
    // https://github.com/supabase/supabase/issues/35754
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // 프로필 조회는 비동기지만 콜백 외부에서 처리
        fetchProfile(session.user.id)
          .then((profile) => {
            setState({
              user: session.user,
              profile,
              session,
              isLoading: false,
              isAuthenticated: true,
            })
          })
          .catch((error) => {
            logger.error('프로필 조회 실패', error)
            // 프로필 조회 실패해도 인증은 유지
            setState({
              user: session.user,
              profile: null,
              session,
              isLoading: false,
              isAuthenticated: true,
            })
          })
      } else {
        setState({
          user: null,
          profile: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    },
    [supabase]
  )

  const signUp = useCallback(
    async (email: string, password: string, nickname: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
        },
      })
      return { data, error }
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [supabase])

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return { error }
    },
    [supabase]
  )

  const updatePassword = useCallback(
    async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      return { error }
    },
    [supabase]
  )

  const refreshProfile = useCallback(async () => {
    if (!state.user) return
    const profile = await fetchProfile(state.user.id)
    setState((prev) => ({ ...prev, profile }))
  }, [state.user, fetchProfile])

  const hasRole = useCallback(
    (roles: Role | Role[]): boolean => {
      if (!state.profile) return false
      const roleArray = Array.isArray(roles) ? roles : [roles]
      return roleArray.includes(state.profile.role)
    },
    [state.profile]
  )

  const isAdmin = useCallback(() => {
    return hasRole([...ADMIN_ROLES])
  }, [hasRole])

  const isModerator = useCallback(() => {
    return hasRole([...MODERATOR_ROLES])
  }, [hasRole])

  const isVip = useCallback(() => {
    return hasRole([...VIP_ROLES])
  }, [hasRole])

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
      hasRole,
      isAdmin,
      isModerator,
      isVip,
    }),
    [
      state,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
      hasRole,
      isAdmin,
      isModerator,
      isVip,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
