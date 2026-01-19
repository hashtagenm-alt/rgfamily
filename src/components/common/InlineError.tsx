'use client'

/**
 * InlineError Component
 *
 * K-0007: 인라인 에러 표시 컴포넌트
 * - 훅의 error 상태를 표시할 때 사용
 * - 재시도 버튼 옵션 제공
 */

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface InlineErrorProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function InlineError({ message, onRetry, className = '' }: InlineErrorProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 rounded-lg bg-(--color-error-bg)] border border-(--color-error-border)] ${className}`}
    >
      <AlertTriangle className="w-8 h-8 text-(--color-error)] mb-3" />
      <p className="text-(--text-secondary)] text-center mb-4">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-(--color-error)] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      )}
    </div>
  )
}

export default InlineError
