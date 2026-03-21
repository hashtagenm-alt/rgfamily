'use client'

import { Group, Menu, ActionIcon } from '@mantine/core'
import {
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react'

interface DataTableActionMenuProps<T> {
  item: T
  onView?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
}

export function DataTableActionMenu<T>({
  item,
  onView,
  onEdit,
  onDelete,
}: DataTableActionMenuProps<T>) {
  return (
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
  )
}
