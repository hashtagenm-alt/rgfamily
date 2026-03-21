'use client'

import { useState, useMemo, useCallback } from 'react'
import type { FilterCondition } from './TableFilters'
import type { Column, BulkAction } from './types'
import { getNestedValue, matchesCondition, PAGE_SIZE_OPTIONS } from './data-table-utils'

interface UseDataTableStateOptions<T extends { id: string | number }> {
  data: T[]
  columns: Column<T>[]
  itemsPerPage: number
  draggable: boolean
  onBulkDelete?: (ids: (string | number)[]) => Promise<void>
  onInlineEdit?: (id: string | number, field: string, value: unknown) => Promise<void>
}

export function useDataTableState<T extends { id: string | number }>({
  data,
  columns,
  itemsPerPage,
  draggable,
  onBulkDelete,
  onInlineEdit,
}: UseDataTableStateOptions<T>) {
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

  // Page size
  const getInitialPageSize = () => {
    const value = String(itemsPerPage)
    const exists = PAGE_SIZE_OPTIONS.some(opt => opt.value === value)
    return exists ? value : '10'
  }
  const [pageSize, setPageSize] = useState<string>(getInitialPageSize())

  // Selection handlers
  const toggleSelectItem = useCallback((id: string | number) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return newSelected
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedItems = data.filter((item) => selectedIds.has(item.id))

  // Bulk handlers
  const handleBulkDelete = useCallback(async () => {
    if (!onBulkDelete || selectedIds.size === 0) return
    setIsBulkProcessing(true)
    try {
      await onBulkDelete(Array.from(selectedIds))
      clearSelection()
    } finally {
      setIsBulkProcessing(false)
    }
  }, [onBulkDelete, selectedIds, clearSelection])

  const handleBulkAction = useCallback(async (action: BulkAction<T>) => {
    if (selectedItems.length === 0) return
    setIsBulkProcessing(true)
    try {
      await action.onClick(selectedItems)
      clearSelection()
    } finally {
      setIsBulkProcessing(false)
    }
  }, [selectedItems, clearSelection])

  // Inline editing handlers
  const startEditing = useCallback((id: string | number, key: string, currentValue: unknown) => {
    setEditingCell({ id, key })
    setEditingValue(currentValue)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingCell(null)
    setEditingValue(null)
  }, [])

  const saveEditing = useCallback(async () => {
    if (!editingCell || !onInlineEdit) return
    setIsSavingInline(true)
    try {
      await onInlineEdit(editingCell.id, editingCell.key, editingValue)
      cancelEditing()
    } finally {
      setIsSavingInline(false)
    }
  }, [editingCell, editingValue, onInlineEdit, cancelEditing])

  // 정렬 핸들러
  const setSorting = useCallback((field: string) => {
    setSortBy(prev => {
      const reversed = field === prev ? !reverseSortDirection : false
      setReverseSortDirection(reversed)
      return field
    })
  }, [reverseSortDirection])

  // 필터링 및 정렬된 데이터
  const processedData = useMemo(() => {
    let filtered = [...data]

    if (filterConditions.length > 0) {
      filtered = filtered.filter((item) => {
        const results = filterConditions.map((cond) => matchesCondition(item, cond))
        return filterLogic === 'AND'
          ? results.every(Boolean)
          : results.some(Boolean)
      })
    }

    if (search) {
      filtered = filtered.filter((item) =>
        columns.some((col) => {
          const value = getNestedValue(item as Record<string, unknown>, col.key as string)
          return String(value).toLowerCase().includes(search.toLowerCase())
        })
      )
    }

    if (sortBy && !draggable) {
      filtered.sort((a, b) => {
        const aValue = getNestedValue(a as Record<string, unknown>, sortBy)
        const bValue = getNestedValue(b as Record<string, unknown>, sortBy)
        if ((aValue as string | number) < (bValue as string | number)) return reverseSortDirection ? 1 : -1
        if ((aValue as string | number) > (bValue as string | number)) return reverseSortDirection ? -1 : 1
        return 0
      })
    }

    return filtered
  }, [data, search, sortBy, reverseSortDirection, columns, draggable, filterConditions, filterLogic])

  // 페이지네이션
  const effectivePageSize = pageSize === 'all' ? processedData.length : parseInt(pageSize, 10)
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(processedData.length / effectivePageSize)
  const paginatedData = pageSize === 'all'
    ? processedData
    : processedData.slice(
        (activePage - 1) * effectivePageSize,
        activePage * effectivePageSize
      )

  const handlePageSizeChange = useCallback((value: string | null) => {
    if (value) {
      setPageSize(value)
      setActivePage(1)
    }
  }, [])

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.currentTarget.value)
    setActivePage(1)
  }, [])

  const handleFilterChange = useCallback((conditions: FilterCondition[]) => {
    setFilterConditions(conditions)
    setActivePage(1)
  }, [])

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === paginatedData.length) {
        return new Set()
      }
      return new Set(paginatedData.map((item) => item.id))
    })
  }, [paginatedData])

  const selectAllState = selectedIds.size === 0
    ? 'none' as const
    : selectedIds.size === paginatedData.length
      ? 'all' as const
      : 'partial' as const

  return {
    // Search & filter
    search,
    handleSearchChange,
    filterConditions,
    handleFilterChange,
    filterLogic,
    setFilterLogic,
    // Sort
    sortBy,
    reverseSortDirection,
    setSorting,
    // Pagination
    pageSize,
    handlePageSizeChange,
    totalPages,
    activePage,
    setActivePage,
    processedData,
    paginatedData,
    // Selection
    selectedIds,
    selectedItems,
    selectAllState,
    handleToggleSelectAll,
    toggleSelectItem,
    clearSelection,
    // Bulk
    isBulkProcessing,
    handleBulkDelete,
    handleBulkAction,
    // Inline editing
    editingCell,
    editingValue,
    setEditingValue,
    startEditing,
    cancelEditing,
    saveEditing,
    isSavingInline,
    setIsSavingInline,
  }
}
