'use client'

import { Group, TextInput, Text } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import TableFilters, { type FilterCondition, type FilterConfig } from './TableFilters'

interface DataTableToolbarProps {
  searchable: boolean
  searchPlaceholder: string
  search: string
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  totalCount: number
  filters?: FilterConfig[]
  filterConditions: FilterCondition[]
  onFilterChange: (conditions: FilterCondition[]) => void
  filterLogic: 'AND' | 'OR'
  onFilterLogicChange: (logic: 'AND' | 'OR') => void
}

export function DataTableToolbar({
  searchable,
  searchPlaceholder,
  search,
  onSearchChange,
  totalCount,
  filters,
  filterConditions,
  onFilterChange,
  filterLogic,
  onFilterLogicChange,
}: DataTableToolbarProps) {
  return (
    <div style={{ borderBottom: '1px solid var(--card-border)' }}>
      <Group justify="space-between" p="md">
        <Group gap="md">
          {searchable && (
            <TextInput
              placeholder={searchPlaceholder}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={onSearchChange}
              style={{ maxWidth: 300 }}
            />
          )}
          {filters && filters.length > 0 && (
            <TableFilters
              filters={filters}
              conditions={filterConditions}
              onChange={onFilterChange}
              logicOperator={filterLogic}
              onLogicChange={onFilterLogicChange}
            />
          )}
        </Group>
        <Text size="sm" c="dimmed">
          총 {totalCount}개
        </Text>
      </Group>
    </div>
  )
}
