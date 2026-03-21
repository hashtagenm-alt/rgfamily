'use client'

import { Table, ActionIcon, Center } from '@mantine/core'
import { IconGripVertical } from '@tabler/icons-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SortableRowProps } from './types'
import { getNestedValue } from './data-table-utils'
import { DataTableActionMenu } from './DataTableActionMenu'

export function DataTableSortableRow<T extends { id: string | number }>({
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
  )
}
