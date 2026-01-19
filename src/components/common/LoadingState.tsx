'use client'

/**
 * LoadingState Component
 *
 * K-0007: 로딩 상태 표시 컴포넌트
 * - 훅의 isLoading 상태를 표시할 때 사용
 */

import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function LoadingState({
  message = '로딩 중...',
  className = '',
  size = 'md',
}: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <Loader2
        className={`${sizeClasses[size]} text-[var(--text-muted)] animate-spin mb-3`}
      />
      <p className="text-[var(--text-muted)] text-sm">{message}</p>
    </div>
  )
}

export default LoadingState
