import type { ReactNode } from 'react'
import type { FilterConfig } from './TableFilters'

export type EditableType = 'text' | 'number' | 'select' | 'checkbox' | 'date'

export interface SelectOption {
  value: string
  label: string
}

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: string
  render?: (item: T) => ReactNode
  sortable?: boolean
  /** 인라인 편집 활성화 */
  editable?: boolean
  /** 편집 타입 */
  editType?: EditableType
  /** select 타입일 때 옵션 목록 */
  selectOptions?: SelectOption[]
}

export interface BulkAction<T> {
  label: string
  icon?: ReactNode
  onClick: (selectedItems: T[]) => Promise<void> | void
  variant?: 'default' | 'danger'
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onView?: (item: T) => void
  searchable?: boolean
  searchPlaceholder?: string
  itemsPerPage?: number
  isLoading?: boolean
  /** 드래그앤드롭 활성화 */
  draggable?: boolean
  /** 드래그 완료 후 콜백 (새 순서의 아이템 배열) */
  onReorder?: (reorderedItems: T[]) => void
  /** 체크박스 선택 활성화 */
  selectable?: boolean
  /** 벌크 삭제 콜백 */
  onBulkDelete?: (ids: (string | number)[]) => Promise<void>
  /** 커스텀 벌크 액션들 */
  bulkActions?: BulkAction<T>[]
  /** 인라인 편집 콜백 */
  onInlineEdit?: (id: string | number, field: string, value: unknown) => Promise<void>
  /** 고급 필터 설정 */
  filters?: FilterConfig[]
}

export interface ThProps {
  children: ReactNode
  reversed: boolean
  sorted: boolean
  onSort: () => void
  sortable: boolean
  width?: string
}

export interface SortableRowProps<T> {
  item: T
  columns: Column<T>[]
  hasActions: boolean
  onView?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
}
