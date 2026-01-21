/**
 * 404 Not Found 페이지
 *
 * 존재하지 않는 경로 접근 시 표시되는 페이지입니다.
 */

import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다 | RG Family',
  description: '요청하신 페이지를 찾을 수 없습니다.',
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-(--background)]">
      <div className="text-center px-4">
        <div className="mb-6">
          <span className="text-8xl font-bold text-(--color-primary)]">
            404
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          페이지를 찾을 수 없습니다
        </h1>

        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          <br />
          URL을 다시 확인해주세요.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/"
            className="px-6 py-3 bg-(--color-primary)] text-white rounded-lg hover:bg-(--primary-deep)] transition-colors"
          >
            홈으로 이동
          </Link>

          <Link
            href="/ranking"
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            랭킹 보기
          </Link>

          <Link
            href="/rg/org"
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            조직도 보기
          </Link>
        </div>

        <div className="mt-12 text-gray-500 text-sm">
          <p>자주 찾는 페이지</p>
          <div className="flex gap-4 justify-center mt-2 flex-wrap">
            <Link href="/schedule" className="hover:text-(--color-primary)]">
              일정
            </Link>
            <span>·</span>
            <Link href="/community/free" className="hover:text-(--color-primary)]">
              커뮤니티
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
