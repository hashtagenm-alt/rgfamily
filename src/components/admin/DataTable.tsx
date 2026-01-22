'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TextInput,
  ScrollArea,
  Pagination,
  Menu,
  ActionIcon,
  Text,
  Group,
  Center,
  Loader,
  Paper,
  UnstyledButton,
  rem,
  Select,
} from '@mantine/core'
import {
  IconSearch,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
  IconGripVertical,
  IconSquare,
  IconSquareCheck,
  IconSquareMinus,
} from '@tabler/icons-react'
import TableFilters, { FilterConfig, FilterCondition } from './TableFilters'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type EditableType = 'text' | 'number' | 'select' | 'checkbox'

export interface SelectOption {
  value: string
  label: string
}

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: string
  render?: (item: T) => React.ReactNode
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
  icon?: React.ReactNode
  onClick: (selectedItems: T[]) => Promise<void> | void
  variant?: 'default' | 'danger'
}

interface DataTableProps<T> {
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

// 중첩 객체 값 가져오기
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj as unknown)
}

// 테이블 헤더 컴포넌트
interface ThProps {
  children: React.ReactNode
  reversed: boolean
  sorted: boolean
  onSort: () => void
  sortable: boolean
  width?: string
}

function Th({ children, reversed, sorted, onSort, sortable, width }: ThProps) {
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector

  return (
    <Table.Th style={{ width }}>
      {sortable ? (
        <UnstyledButton onClick={onSort} className="w-full">
          <Group justify="space-between" gap="xs">
            <Text fw={600} size="xs" tt="uppercase" c="dimmed">
              {children}
            </Text>
            <Center>
              <Icon style={{ width: rem(16), height: rem(16) }} />
            </Center>
          </Group>
        </UnstyledButton>
      ) : (
        <Text fw={600} size="xs" tt="uppercase" c="dimmed">
          {children}
        </Text>
      )}
    </Table.Th>
  )
}

// Sortable Row 컴포넌트
interface SortableRowProps<T> {
  item: T
  columns: Column<T>[]
  hasActions: boolean
  onView?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
}

function SortableRow<T extends { id: string | number }>({
  item,
  columns,
  hasActions,
  onView,
  onEdit,
  onDelete,
}: SortableRowProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? 'var(--mantine-color-dark-6)' : undefined,
  }

  return (
    <Table.Tr
      ref={setNodeRef}
      style={{ ...style, cursor: onView ? 'pointer' : undefined }}
      onClick={() => onView?.(item)}
    >
      {/* Drag Handle */}
      <Table.Td style={{ width: 40 }}>
        <Center>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            style={{ cursor: 'grab' }}
            {...attributes}
            {...listeners}
          >
            <IconGripVertical size={16} />
          </ActionIcon>
        </Center>
      </Table.Td>
      {columns.map((col) => (
        <Table.Td key={col.key as string}>
          {col.render
            ? col.render(item)
            : String(getNestedValue(item as Record<string, unknown>, col.key as string) ?? '-')}
        </Table.Td>
      ))}
      {hasActions && (
        <Table.Td>
          <Group justify="center">
            <Menu shadow="md" width={140} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="sm">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {onView && (
                  <Menu.Item
                    leftSection={<IconEye size={14} />}
                    onClick={() => onView(item)}
                  >
                    보기
                  </Menu.Item>
                )}
                {onEdit && (
                  <Menu.Item
                    leftSection={<IconEdit size={14} />}
                    onClick={() => onEdit(item)}
                  >
                    수정
                  </Menu.Item>
                )}
                {onDelete && (
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    onClick={() => onDelete(item)}
                  >
                    삭제
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Table.Td>
      )}
    </Table.Tr>
  )
}

const PAGE_SIZE_OPTIONS = [
  { value: 'all', label: '전체 보기' },
  { value: '5', label: '5개씩 보기' },
  { value: '10', label: '10개씩 보기' },
  { value: '20', label: '20개씩 보기' },
  { value: '50', label: '50개씩 보기' },
]

export default function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onEdit,
  onDelete,
  onView,
  searchable = true,
  searchPlaceholder = '검색...',
  itemsPerPage = 10,
  isLoading = false,
  draggable = false,
  onReorder,
  selectable = false,
  onBulkDelete,
  bulkActions,
  onInlineEdit,
  filters,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [reverseSortDirection, setReverseSortDirection] = useState(false)
  const [activePage, setActivePage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ id: string | number; key: string } | null>(null)
  const [editingValue, setEditingValue] = useState<unknown>(null)
  const [isSavingInline, setIsSavingInline] = useState(false)

  // Advanced filter state
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([])
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND')

  // itemsPerPage가 옵션에 없으면 가장 가까운 값 선택
  const getInitialPageSize = () => {
    const value = String(itemsPerPage)
    const exists = PAGE_SIZE_OPTIONS.some(opt => opt.value === value)
    return exists ? value : '10'
  }
  const [pageSize, setPageSize] = useState<string>(getInitialPageSize())

  const hasActions = onEdit || onDelete || onView
  const showSelectable = selectable && (onBulkDelete || bulkActions)

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedData.map((item) => item.id)))
    }
  }

  const toggleSelectItem = (id: string | number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Get selected items
  const selectedItems = data.filter((item) => selectedIds.has(item.id))

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedIds.size === 0) return
    setIsBulkProcessing(true)
    try {
      await onBulkDelete(Array.from(selectedIds))
      clearSelection()
    } finally {
      setIsBulkProcessing(false)
    }
  }

  // Custom bulk action handler
  const handleBulkAction = async (action: BulkAction<T>) => {
    if (selectedItems.length === 0) return
    setIsBulkProcessing(true)
    try {
      await action.onClick(selectedItems)
      clearSelection()
    } finally {
      setIsBulkProcessing(false)
    }
  }

  // Inline editing handlers
  const startEditing = (id: string | number, key: string, currentValue: unknown) => {
    setEditingCell({ id, key })
    setEditingValue(currentValue)
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setEditingValue(null)
  }

  const saveEditing = async () => {
    if (!editingCell || !onInlineEdit) return
    setIsSavingInline(true)
    try {
      await onInlineEdit(editingCell.id, editingCell.key, editingValue)
      cancelEditing()
    } finally {
      setIsSavingInline(false)
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditing()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 정렬 핸들러
  const setSorting = (field: string) => {
    const reversed = field === sortBy ? !reverseSortDirection : false
    setReverseSortDirection(reversed)
    setSortBy(field)
  }

  // Check if a single filter condition matches an item
  const matchesCondition = useCallback((item: T, condition: FilterCondition): boolean => {
    const value = getNestedValue(item as Record<string, unknown>, condition.field)
    const conditionValue = condition.value
    const conditionValue2 = condition.value2

    switch (condition.operator) {
      case 'equals':
        if (conditionValue === null || conditionValue === '') return true
        return String(value).toLowerCase() === String(conditionValue).toLowerCase()
      case 'contains':
        if (conditionValue === null || conditionValue === '') return true
        return String(value).toLowerCase().includes(String(conditionValue).toLowerCase())
      case 'gt':
        if (conditionValue === null) return true
        return Number(value) > Number(conditionValue)
      case 'lt':
        if (conditionValue === null) return true
        return Number(value) < Number(conditionValue)
      case 'gte':
        if (conditionValue === null) return true
        return Number(value) >= Number(conditionValue)
      case 'lte':
        if (conditionValue === null) return true
        return Number(value) <= Number(conditionValue)
      case 'between':
        if (conditionValue === null || conditionValue2 === null) return true
        const numValue = Number(value)
        return numValue >= Number(conditionValue) && numValue <= Number(conditionValue2)
      case 'isEmpty':
        return value === null || value === undefined || value === ''
      case 'isNotEmpty':
        return value !== null && value !== undefined && value !== ''
      default:
        return true
    }
  }, [])

  // 필터링 및 정렬된 데이터
  const processedData = useMemo(() => {
    let filtered = [...data]

    // 고급 필터 적용
    if (filterConditions.length > 0) {
      filtered = filtered.filter((item) => {
        const results = filterConditions.map((cond) => matchesCondition(item, cond))
        return filterLogic === 'AND'
          ? results.every(Boolean)
          : results.some(Boolean)
      })
    }

    // 검색 필터
    if (search) {
      filtered = filtered.filter((item) =>
        columns.some((col) => {
          const value = getNestedValue(item as Record<string, unknown>, col.key as string)
          return String(value).toLowerCase().includes(search.toLowerCase())
        })
      )
    }

    // 정렬 (드래그 모드에서는 정렬 비활성화)
    if (sortBy && !draggable) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a as Record<string, unknown>, sortBy)
        const bValue = getNestedValue(b as Record<string, unknown>, sortBy)

        if ((aValue as string | number) < (bValue as string | number)) {
          return reverseSortDirection ? 1 : -1
        }
        if ((aValue as string | number) > (bValue as string | number)) {
          return reverseSortDirection ? -1 : 1
        }
        return 0
      })
    }

    return filtered
  }, [data, search, sortBy, reverseSortDirection, columns, draggable, filterConditions, filterLogic, matchesCondition])

  // 페이지네이션
  const effectivePageSize = pageSize === 'all' ? processedData.length : parseInt(pageSize, 10)
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(processedData.length / effectivePageSize)
  const paginatedData = pageSize === 'all'
    ? processedData
    : processedData.slice(
        (activePage - 1) * effectivePageSize,
        activePage * effectivePageSize
      )

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = (value: string | null) => {
    if (value) {
      setPageSize(value)
      setActivePage(1)
    }
  }

  // 검색 시 페이지 리셋
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.currentTarget.value)
    setActivePage(1)
  }

  // 드래그 완료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = paginatedData.findIndex((item) => item.id === active.id)
    const newIndex = paginatedData.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(paginatedData, oldIndex, newIndex)
    onReorder?.(reordered)
  }

  // 일반 테이블 행 렌더링
  const rows = paginatedData.map((item) => (
    <Table.Tr
      key={item.id}
      style={{
        cursor: onView ? 'pointer' : undefined,
        backgroundColor: selectedIds.has(item.id) ? 'var(--mantine-color-pink-light)' : undefined,
      }}
      onClick={() => onView?.(item)}
    >
      {showSelectable && (
        <Table.Td style={{ width: 40 }} onClick={(e) => e.stopPropagation()}>
          <Center>
            <ActionIcon
              variant="subtle"
              color={selectedIds.has(item.id) ? 'pink' : 'gray'}
              size="sm"
              onClick={() => toggleSelectItem(item.id)}
            >
              {selectedIds.has(item.id) ? (
                <IconSquareCheck size={18} />
              ) : (
                <IconSquare size={18} />
              )}
            </ActionIcon>
          </Center>
        </Table.Td>
      )}
      {columns.map((col) => {
        const cellKey = col.key as string
        const cellValue = getNestedValue(item as Record<string, unknown>, cellKey)
        const isEditing = editingCell?.id === item.id && editingCell?.key === cellKey
        const canEdit = col.editable && onInlineEdit

        return (
          <Table.Td
            key={cellKey}
            onDoubleClick={canEdit ? (e) => {
              e.stopPropagation()
              startEditing(item.id, cellKey, cellValue)
            } : undefined}
            style={canEdit ? { cursor: 'text' } : undefined}
            title={canEdit ? '더블클릭하여 편집' : undefined}
          >
            {isEditing ? (
              <div onClick={(e) => e.stopPropagation()}>
                {col.editType === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={!!editingValue}
                    onChange={(e) => {
                      setEditingValue(e.target.checked)
                      // Auto-save on checkbox change
                      if (onInlineEdit) {
                        setIsSavingInline(true)
                        onInlineEdit(item.id, cellKey, e.target.checked)
                          .finally(() => {
                            setIsSavingInline(false)
                            cancelEditing()
                          })
                      }
                    }}
                    disabled={isSavingInline}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
                  />
                ) : col.editType === 'select' ? (
                  <select
                    value={String(editingValue ?? '')}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={handleEditKeyDown}
                    autoFocus
                    disabled={isSavingInline}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid var(--primary)',
                      borderRadius: '4px',
                      background: 'var(--card-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      minWidth: '100px',
                    }}
                  >
                    {col.selectOptions?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : col.editType === 'number' ? (
                  <input
                    type="number"
                    value={String(editingValue ?? '')}
                    onChange={(e) => setEditingValue(e.target.valueAsNumber || e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={handleEditKeyDown}
                    autoFocus
                    disabled={isSavingInline}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid var(--primary)',
                      borderRadius: '4px',
                      background: 'var(--card-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      width: '100%',
                      minWidth: '60px',
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(editingValue ?? '')}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={saveEditing}
                    onKeyDown={handleEditKeyDown}
                    autoFocus
                    disabled={isSavingInline}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid var(--primary)',
                      borderRadius: '4px',
                      background: 'var(--card-bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      width: '100%',
                      minWidth: '100px',
                    }}
                  />
                )}
              </div>
            ) : (
              col.render
                ? col.render(item)
                : String(cellValue ?? '-')
            )}
          </Table.Td>
        )
      })}
      {hasActions && (
        <Table.Td>
          <Group justify="center">
            <Menu shadow="md" width={140} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="sm">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {onView && (
                  <Menu.Item
                    leftSection={<IconEye size={14} />}
                    onClick={() => onView(item)}
                  >
                    보기
                  </Menu.Item>
                )}
                {onEdit && (
                  <Menu.Item
                    leftSection={<IconEdit size={14} />}
                    onClick={() => onEdit(item)}
                  >
                    수정
                  </Menu.Item>
                )}
                {onDelete && (
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    onClick={() => onDelete(item)}
                  >
                    삭제
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Table.Td>
      )}
    </Table.Tr>
  ))

  // Calculate total columns for colSpan
  const totalColumns = columns.length + (hasActions ? 1 : 0) + (draggable ? 1 : 0) + (showSelectable ? 1 : 0)

  // 테이블 바디 렌더링
  const renderTableBody = () => {
    if (isLoading) {
      return (
        <Table.Tr>
          <Table.Td colSpan={totalColumns}>
            <Center py="xl">
              <Loader color="pink" size="md" />
              <Text ml="md" c="dimmed">
                데이터를 불러오는 중...
              </Text>
            </Center>
          </Table.Td>
        </Table.Tr>
      )
    }

    if (paginatedData.length === 0) {
      return (
        <Table.Tr>
          <Table.Td colSpan={totalColumns}>
            <Center py="xl">
              <Text c="dimmed">데이터가 없습니다</Text>
            </Center>
          </Table.Td>
        </Table.Tr>
      )
    }

    if (draggable) {
      return (
        <SortableContext
          items={paginatedData.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {paginatedData.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              columns={columns}
              hasActions={!!hasActions}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      )
    }

    return rows
  }

  // Determine checkbox state for select all
  const selectAllState = selectedIds.size === 0
    ? 'none'
    : selectedIds.size === paginatedData.length
      ? 'all'
      : 'partial'

  const tableContent = (
    <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
      <Table.Thead>
        <Table.Tr>
          {showSelectable && (
            <Table.Th style={{ width: 40 }}>
              <Center>
                <ActionIcon
                  variant="subtle"
                  color={selectAllState !== 'none' ? 'pink' : 'gray'}
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectAllState === 'all' ? (
                    <IconSquareCheck size={18} />
                  ) : selectAllState === 'partial' ? (
                    <IconSquareMinus size={18} />
                  ) : (
                    <IconSquare size={18} />
                  )}
                </ActionIcon>
              </Center>
            </Table.Th>
          )}
          {draggable && (
            <Table.Th style={{ width: 40 }}>
              <Text fw={600} size="xs" tt="uppercase" c="dimmed">

              </Text>
            </Table.Th>
          )}
          {columns.map((col) => (
            <Th
              key={col.key as string}
              sorted={sortBy === col.key}
              reversed={reverseSortDirection}
              onSort={() => setSorting(col.key as string)}
              sortable={col.sortable !== false && !draggable}
              width={col.width}
            >
              {col.header}
            </Th>
          ))}
          {hasActions && (
            <Table.Th style={{ width: 80, textAlign: 'center' }}>
              <Text fw={600} size="xs" tt="uppercase" c="dimmed">
                작업
              </Text>
            </Table.Th>
          )}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{renderTableBody()}</Table.Tbody>
    </Table>
  )

  return (
    <Paper withBorder radius="md" p={0}>
      {/* Bulk Actions Toolbar */}
      {showSelectable && selectedIds.size > 0 && (
        <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--mantine-color-pink-light)' }}>
          <Group gap="md">
            <Text size="sm" fw={600} c="pink">
              {selectedIds.size}개 선택됨
            </Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={clearSelection}
              title="선택 해제"
            >
              <IconSquare size={16} />
            </ActionIcon>
          </Group>
          <Group gap="sm">
            {bulkActions?.map((action, index) => (
              <UnstyledButton
                key={index}
                onClick={() => handleBulkAction(action)}
                disabled={isBulkProcessing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  background: action.variant === 'danger' ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-gray-6)',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  opacity: isBulkProcessing ? 0.6 : 1,
                }}
              >
                {action.icon}
                {action.label}
              </UnstyledButton>
            ))}
            {onBulkDelete && (
              <UnstyledButton
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  background: 'var(--mantine-color-red-6)',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  opacity: isBulkProcessing ? 0.6 : 1,
                }}
              >
                <IconTrash size={14} />
                삭제
              </UnstyledButton>
            )}
          </Group>
        </Group>
      )}

      {/* 검색 툴바 및 필터 */}
      {(searchable || filters) && (
        <div style={{ borderBottom: '1px solid var(--card-border)' }}>
          <Group justify="space-between" p="md">
            <Group gap="md">
              {searchable && (
                <TextInput
                  placeholder={searchPlaceholder}
                  leftSection={<IconSearch size={16} />}
                  value={search}
                  onChange={handleSearchChange}
                  style={{ maxWidth: 300 }}
                />
              )}
              {filters && filters.length > 0 && (
                <TableFilters
                  filters={filters}
                  conditions={filterConditions}
                  onChange={(conditions) => {
                    setFilterConditions(conditions)
                    setActivePage(1)
                  }}
                  logicOperator={filterLogic}
                  onLogicChange={setFilterLogic}
                />
              )}
            </Group>
            <Text size="sm" c="dimmed">
              총 {processedData.length}개
            </Text>
          </Group>
        </div>
      )}

      {/* 테이블 */}
      <ScrollArea>
        {draggable ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {tableContent}
          </DndContext>
        ) : (
          tableContent
        )}
      </ScrollArea>

      {/* 페이지네이션 */}
      <Group justify="space-between" p="md" style={{ borderTop: '1px solid var(--card-border)' }}>
        <Select
          value={pageSize}
          onChange={handlePageSizeChange}
          data={PAGE_SIZE_OPTIONS}
          size="xs"
          style={{ width: 130 }}
        />
        {totalPages > 1 && (
          <Pagination
            value={activePage}
            onChange={setActivePage}
            total={totalPages}
            color="pink"
            size="sm"
            withEdges
          />
        )}
      </Group>
    </Paper>
  )
}
