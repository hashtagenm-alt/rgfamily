'use client'

import {
  Table,
  Text,
  Group,
  Center,
  UnstyledButton,
  ActionIcon,
  rem,
} from '@mantine/core'
import {
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconSquare,
  IconSquareCheck,
  IconSquareMinus,
} from '@tabler/icons-react'
import type { ThProps, Column } from './types'

// 테이블 헤더 셀 컴포넌트
export function Th({ children, reversed, sorted, onSort, sortable, width }: ThProps) {
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

type SelectAllState = 'none' | 'all' | 'partial'

interface DataTableHeaderRowProps<T> {
  columns: Column<T>[]
  sortBy: string | null
  reverseSortDirection: boolean
  onSort: (field: string) => void
  draggable: boolean
  hasActions: boolean
  showSelectable: boolean
  selectAllState: SelectAllState
  onToggleSelectAll: () => void
}

export function DataTableHeaderRow<T>({
  columns,
  sortBy,
  reverseSortDirection,
  onSort,
  draggable,
  hasActions,
  showSelectable,
  selectAllState,
  onToggleSelectAll,
}: DataTableHeaderRowProps<T>) {
  return (
    <Table.Thead>
      <Table.Tr>
        {showSelectable && (
          <Table.Th style={{ width: 40 }}>
            <Center>
              <ActionIcon
                variant="subtle"
                color={selectAllState !== 'none' ? 'pink' : 'gray'}
                size="sm"
                onClick={onToggleSelectAll}
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
            onSort={() => onSort(col.key as string)}
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
  )
}
