'use client'

import { Table, Center, Loader, Text, ActionIcon } from '@mantine/core'
import { IconSquare, IconSquareCheck } from '@tabler/icons-react'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Column } from './types'
import { getNestedValue } from './data-table-utils'
import { DataTableActionMenu } from './DataTableActionMenu'
import { DataTableSortableRow } from './DataTableSortableRow'
import { InlineCellEditor } from './DataTableInlineCell'

interface EditingCell {
  id: string | number
  key: string
}

interface DataTableBodyProps<T extends { id: string | number }> {
  paginatedData: T[]
  columns: Column<T>[]
  isLoading: boolean
  totalColumns: number
  draggable: boolean
  hasActions: boolean
  showSelectable: boolean
  selectedIds: Set<string | number>
  onToggleSelectItem: (id: string | number) => void
  onView?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  // Inline editing
  editingCell: EditingCell | null
  editingValue: unknown
  setEditingValue: (value: unknown) => void
  onStartEditing: (id: string | number, key: string, currentValue: unknown) => void
  onSaveEditing: () => void
  onCancelEditing: () => void
  isSavingInline: boolean
  onInlineEdit?: (id: string | number, field: string, value: unknown) => Promise<void>
  setIsSavingInline: (saving: boolean) => void
}

export function DataTableBody<T extends { id: string | number }>({
  paginatedData,
  columns,
  isLoading,
  totalColumns,
  draggable,
  hasActions,
  showSelectable,
  selectedIds,
  onToggleSelectItem,
  onView,
  onEdit,
  onDelete,
  editingCell,
  editingValue,
  setEditingValue,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  isSavingInline,
  onInlineEdit,
  setIsSavingInline,
}: DataTableBodyProps<T>) {
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveEditing()
    } else if (e.key === 'Escape') {
      onCancelEditing()
    }
  }

  if (isLoading) {
    return (
      <Table.Tbody>
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
      </Table.Tbody>
    )
  }

  if (paginatedData.length === 0) {
    return (
      <Table.Tbody>
        <Table.Tr>
          <Table.Td colSpan={totalColumns}>
            <Center py="xl">
              <Text c="dimmed">데이터가 없습니다</Text>
            </Center>
          </Table.Td>
        </Table.Tr>
      </Table.Tbody>
    )
  }

  if (draggable) {
    return (
      <Table.Tbody>
        <SortableContext
          items={paginatedData.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {paginatedData.map((item) => (
            <DataTableSortableRow
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
      </Table.Tbody>
    )
  }

  return (
    <Table.Tbody>
      {paginatedData.map((item) => (
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
                  onClick={() => onToggleSelectItem(item.id)}
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
                  onStartEditing(item.id, cellKey, cellValue)
                } : undefined}
                style={canEdit ? { cursor: 'text' } : undefined}
                title={canEdit ? '더블클릭하여 편집' : undefined}
              >
                {isEditing ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <InlineCellEditor
                      editType={col.editType}
                      editingValue={editingValue}
                      setEditingValue={setEditingValue}
                      onSave={onSaveEditing}
                      onKeyDown={handleEditKeyDown}
                      isSaving={isSavingInline}
                      selectOptions={col.selectOptions}
                      onAutoSave={col.editType === 'checkbox' ? (checked: boolean) => {
                        if (onInlineEdit) {
                          setIsSavingInline(true)
                          onInlineEdit(item.id, cellKey, checked)
                            .finally(() => {
                              setIsSavingInline(false)
                              onCancelEditing()
                            })
                        }
                      } : undefined}
                    />
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
            <Table.Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <DataTableActionMenu
                item={item}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </Table.Td>
          )}
        </Table.Tr>
      ))}
    </Table.Tbody>
  )
}
