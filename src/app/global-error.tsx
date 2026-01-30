'use client'

/**
 * 글로벌 에러 페이지
 *
 * root layout 레벨에서 발생하는 에러를 처리합니다.
 * Next.js App Router의 최상위 에러 바운더리입니다.
 */

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // 에러 로깅
    console.error('Global error caught:', error)
  }, [error])

  return (
    <html>
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>
            😵
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>
            문제가 발생했습니다
          </h1>

          <p style={{ color: '#9ca3af', marginBottom: '32px', maxWidth: '400px' }}>
            예상치 못한 오류가 발생했습니다.
            <br />
            잠시 후 다시 시도해주세요.
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div style={{
              marginBottom: '32px',
              padding: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              maxWidth: '500px',
              margin: '0 auto 32px',
            }}>
              <p style={{
                color: '#f87171',
                fontSize: '14px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                margin: 0,
              }}>
                {error.message}
              </p>
              {error.stack && (
                <pre style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  textAlign: 'left',
                  marginTop: '12px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                }}>
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#fd68ba',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              다시 시도
            </button>

            <a
              href="/"
              style={{
                padding: '12px 24px',
                backgroundColor: '#374151',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '16px',
              }}
            >
              홈으로 이동
            </a>
          </div>

          {error.digest && (
            <p style={{ marginTop: '32px', color: '#6b7280', fontSize: '12px' }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
