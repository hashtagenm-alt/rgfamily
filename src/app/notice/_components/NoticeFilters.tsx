import Link from 'next/link'
import { Search, ChevronDown, PenSquare } from 'lucide-react'
import styles from '../page.module.css'

interface NoticeFiltersProps {
  totalCount: number
  categories: string[]
  filterCategory: string
  onFilterCategory: (category: string) => void
  searchType: 'all' | 'title'
  onSearchType: (type: 'all' | 'title') => void
  searchQuery: string
  onSearchQuery: (query: string) => void
  onSearch: () => void
  showWriteButton: boolean
}

export default function NoticeFilters({
  totalCount,
  categories,
  filterCategory,
  onFilterCategory,
  searchType,
  onSearchType,
  searchQuery,
  onSearchQuery,
  onSearch,
  showWriteButton,
}: NoticeFiltersProps) {
  return (
    <div className={styles.boardHeader}>
      {/* Left: Stats & Category Filter */}
      <div className={styles.boardLeft}>
        <span className={styles.totalCount}>
          전체 <strong>{totalCount}</strong>건
        </span>
        <div className={styles.categoryTabs}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.categoryTab} ${(filterCategory === cat || (filterCategory === 'all' && cat === '전체')) ? styles.active : ''}`}
              onClick={() => onFilterCategory(cat === '전체' ? 'all' : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Search + Admin Write Button */}
      <div className={styles.headerRight}>
        <div className={styles.searchArea}>
          <div className={styles.searchTypeSelect}>
            <select
              value={searchType}
              onChange={(e) => onSearchType(e.target.value as 'all' | 'title')}
              className={styles.select}
            >
              <option value="all">전체</option>
              <option value="title">제목</option>
            </select>
            <ChevronDown size={14} className={styles.selectIcon} />
          </div>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="검색어 입력"
              value={searchQuery}
              onChange={(e) => onSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
            <button className={styles.searchBtn}>
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* 운영진 글쓰기 버튼 (moderator 이상) */}
        {showWriteButton && (
          <Link href="/notice/write" className={styles.writeBtn}>
            <PenSquare size={16} />
            <span>글쓰기</span>
          </Link>
        )}
      </div>
    </div>
  )
}
