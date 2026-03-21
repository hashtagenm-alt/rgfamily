'use client'

import { useCallback } from 'react'
import { Table, ScrollArea, Paper } from '@mantine/core'
import type {
  EditableType,
  SelectOption,
  Column,
  BulkAction,
  DataTableProps,
} from './types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useDataTableState } from './useDataTableState'
import { DataTableHeaderRow } from './DataTableHeader'
import { DataTableBody } from './DataTableBody'
import { DataTablePagination } from './DataTablePagination'
import { DataTableBulkActions } from './DataTableBulkActions'
import { DataTableToolbar } from './DataTableToolbar'

// Types re-exported for backward compatibility
export type { EditableType, SelectOption, Column, BulkAction } from './types'

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
  const state = useDataTableState({
    data,
    columns,
    itemsPerPage,
    draggable,
    onBulkDelete,
    onInlineEdit,
  })

  const hasActions = onEdit || onDelete || onView
  const showSelectable = selectable && (onBulkDelete || bulkActions)
  const totalColumns = columns.length + (hasActions ? 1 : 0) + (draggable ? 1 : 0) + (showSelectable ? 1 : 0)

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = state.paginatedData.findIndex((item) => item.id === active.id)
    const newIndex = state.paginatedData.findIndex((item) => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(state.paginatedData, oldIndex, newIndex)
    onReorder?.(reordered)
  }, [state.paginatedData, onReorder])

  const tableContent = (
    <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
      <DataTableHeaderRow
        columns={columns}
        sortBy={state.sortBy}
        reverseSortDirection={state.reverseSortDirection}
        onSort={state.setSorting}
        draggable={draggable}
        hasActions={!!hasActions}
        showSelectable={!!showSelectable}
        selectAllState={state.selectAllState}
        onToggleSelectAll={state.handleToggleSelectAll}
      />
      <DataTableBody
        paginatedData={state.paginatedData}
        columns={columns}
        isLoading={isLoading}
        totalColumns={totalColumns}
        draggable={draggable}
        hasActions={!!hasActions}
        showSelectable={!!showSelectable}
        selectedIds={state.selectedIds}
        onToggleSelectItem={state.toggleSelectItem}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        editingCell={state.editingCell}
        editingValue={state.editingValue}
        setEditingValue={state.setEditingValue}
        onStartEditing={state.startEditing}
        onSaveEditing={state.saveEditing}
        onCancelEditing={state.cancelEditing}
        isSavingInline={state.isSavingInline}
        onInlineEdit={onInlineEdit}
        setIsSavingInline={state.setIsSavingInline}
      />
    </Table>
  )

  return (
    <Paper withBorder radius="md" p={0}>
      {showSelectable && (
        <DataTableBulkActions
          selectedCount={state.selectedIds.size}
          onClearSelection={state.clearSelection}
          bulkActions={bulkActions}
          selectedItems={state.selectedItems}
          onBulkDelete={onBulkDelete}
          selectedIds={state.selectedIds}
          isBulkProcessing={state.isBulkProcessing}
          onBulkAction={state.handleBulkAction}
          onBulkDeleteClick={state.handleBulkDelete}
        />
      )}

      {(searchable || filters) && (
        <DataTableToolbar
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          search={state.search}
          onSearchChange={state.handleSearchChange}
          totalCount={state.processedData.length}
          filters={filters}
          filterConditions={state.filterConditions}
          onFilterChange={state.handleFilterChange}
          filterLogic={state.filterLogic}
          onFilterLogicChange={state.setFilterLogic}
        />
      )}

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

      <DataTablePagination
        pageSize={state.pageSize}
        onPageSizeChange={state.handlePageSizeChange}
        totalPages={state.totalPages}
        activePage={state.activePage}
        onPageChange={state.setActivePage}
      />
    </Paper>
  )
}
