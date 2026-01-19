'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import styles from './Pagination.module.css'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  /** 표시할 페이지 버튼 수 (기본값: 5) */
  pageRange?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageRange = 5,
}: PaginationProps) {
  if (totalPages <= 1) return null

  // 표시할 페이지 범위 계산
  const halfRange = Math.floor(pageRange / 2)
  let startPage = Math.max(1, currentPage - halfRange)
  const endPage = Math.min(totalPages, startPage + pageRange - 1)

  // 끝 페이지가 범위보다 작으면 시작 페이지 조정
  if (endPage - startPage + 1 < pageRange) {
    startPage = Math.max(1, endPage - pageRange + 1)
  }

  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  )

  return (
    <div className={styles.pagination}>
      {/* 맨 처음 */}
      <button
        className={styles.pageBtn}
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label="첫 페이지"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* 이전 */}
      <button
        className={styles.pageBtn}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="이전 페이지"
      >
        <ChevronLeft size={16} />
      </button>

      {/* 페이지 번호들 */}
      {pages.map((page) => (
        <button
          key={page}
          className={`${styles.pageBtn} ${page === currentPage ? styles.active : ''}`}
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      {/* 다음 */}
      <button
        className={styles.pageBtn}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="다음 페이지"
      >
        <ChevronRight size={16} />
      </button>

      {/* 맨 끝 */}
      <button
        className={styles.pageBtn}
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="마지막 페이지"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  )
}
