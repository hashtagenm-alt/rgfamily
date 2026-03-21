import { Filter, Search } from 'lucide-react'
import type { FilterType, SourceFilter } from './types'
import styles from '../../shared.module.css'
import pageStyles from '../page.module.css'

interface DonorFilterBarProps {
  filter: FilterType
  sourceFilter: SourceFilter
  searchTerm: string
  onFilterChange: (value: FilterType) => void
  onSourceFilterChange: (value: SourceFilter) => void
  onSearchTermChange: (value: string) => void
}

export function DonorFilterBar({
  filter,
  sourceFilter,
  searchTerm,
  onFilterChange,
  onSourceFilterChange,
  onSearchTermChange,
}: DonorFilterBarProps) {
  return (
    <div className={pageStyles.filterBar}>
      <div className={pageStyles.filterGroup}>
        <Filter size={16} />
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value as FilterType)}
          className={styles.select}
        >
          <option value="all">전체</option>
          <option value="linked">연결됨</option>
          <option value="unlinked">미연결</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value as SourceFilter)}
          className={styles.select}
        >
          <option value="all">모든 랭킹</option>
          <option value="season">시즌 랭킹</option>
          <option value="total">총 후원 랭킹</option>
        </select>
      </div>
      <div className={pageStyles.searchWrapper}>
        <Search size={16} />
        <input
          type="text"
          placeholder="후원자 닉네임 검색..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className={styles.input}
        />
      </div>
    </div>
  )
}
