'use client'

/**
 * 글로벌 에러 페이지
 *
 * 앱 내에서 발생하는 런타임 에러를 처리합니다.
 * Next.js Error Boundary로 자동 래핑됩니다.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 에러 로깅 (개발: 콘솔, 프로덕션: 에러 트래킹 서비스)
    logger.error('Error caught by error boundary', error, {
      context: {
        digest: error.digest,
        stack: error.stack,
      },
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--background)]">
      <div className="text-center px-4">
        <div className="mb-6">
          <span className="text-6xl">😵</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          문제가 발생했습니다
        </h1>

        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          예상치 못한 오류가 발생했습니다.
          <br />
          잠시 후 다시 시도해주세요.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg max-w-lg mx-auto">
            <p className="text-red-400 text-sm font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-(--color-primary)] text-white rounded-lg hover:bg-(--primary-deep)] transition-colors"
          >
            다시 시도
          </button>

          <Link
            href="/"
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            홈으로 이동
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-gray-500 text-xs">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
