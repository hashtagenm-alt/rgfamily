'use client'

import { Group, Select, Pagination } from '@mantine/core'
import { PAGE_SIZE_OPTIONS } from './data-table-utils'

interface DataTablePaginationProps {
  pageSize: string
  onPageSizeChange: (value: string | null) => void
  totalPages: number
  activePage: number
  onPageChange: (page: number) => void
}

export function DataTablePagination({
  pageSize,
  onPageSizeChange,
  totalPages,
  activePage,
  onPageChange,
}: DataTablePaginationProps) {
  return (
    <Group justify="space-between" p="md" style={{ borderTop: '1px solid var(--card-border)' }}>
      <Select
        value={pageSize}
        onChange={onPageSizeChange}
        data={PAGE_SIZE_OPTIONS}
        size="xs"
        style={{ width: 130 }}
      />
      {totalPages > 1 && (
        <Pagination
          value={activePage}
          onChange={onPageChange}
          total={totalPages}
          color="pink"
          size="sm"
          withEdges
        />
      )}
    </Group>
  )
}
