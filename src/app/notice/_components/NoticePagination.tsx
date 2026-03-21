import styles from '../page.module.css'

interface NoticePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPageNumbers(currentPage: number, totalPages: number): number[] {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages, start + maxVisible - 1)

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
}

export default function NoticePagination({
  currentPage,
  totalPages,
  onPageChange,
}: NoticePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageBtn}
        disabled={currentPage === 1}
        onClick={() => onPageChange(1)}
      >
        &laquo;
      </button>
      <button
        className={styles.pageBtn}
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        &lsaquo;
      </button>
      {getPageNumbers(currentPage, totalPages).map(pageNum => (
        <button
          key={pageNum}
          className={`${styles.pageBtn} ${currentPage === pageNum ? styles.active : ''}`}
          onClick={() => onPageChange(pageNum)}
        >
          {pageNum}
        </button>
      ))}
      <button
        className={styles.pageBtn}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        &rsaquo;
      </button>
      <button
        className={styles.pageBtn}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
      >
        &raquo;
      </button>
    </div>
  )
}
