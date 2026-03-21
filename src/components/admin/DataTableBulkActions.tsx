'use client'

import { Group, Text, ActionIcon, UnstyledButton } from '@mantine/core'
import { IconSquare, IconTrash } from '@tabler/icons-react'
import type { BulkAction } from './types'

interface DataTableBulkActionsProps<T> {
  selectedCount: number
  onClearSelection: () => void
  bulkActions?: BulkAction<T>[]
  selectedItems: T[]
  onBulkDelete?: (ids: (string | number)[]) => Promise<void>
  selectedIds: Set<string | number>
  isBulkProcessing: boolean
  onBulkAction: (action: BulkAction<T>) => Promise<void>
  onBulkDeleteClick: () => Promise<void>
}

export function DataTableBulkActions<T>({
  selectedCount,
  onClearSelection,
  bulkActions,
  onBulkDelete,
  isBulkProcessing,
  onBulkAction,
  onBulkDeleteClick,
}: DataTableBulkActionsProps<T>) {
  if (selectedCount === 0) return null

  return (
    <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--mantine-color-pink-light)' }}>
      <Group gap="md">
        <Text size="sm" fw={600} c="pink">
          {selectedCount}개 선택됨
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={onClearSelection}
          title="선택 해제"
        >
          <IconSquare size={16} />
        </ActionIcon>
      </Group>
      <Group gap="sm">
        {bulkActions?.map((action, index) => (
          <UnstyledButton
            key={index}
            onClick={() => onBulkAction(action)}
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
            onClick={onBulkDeleteClick}
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
  )
}
