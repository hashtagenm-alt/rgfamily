import type { FilterCondition } from './TableFilters'

// 중첩 객체 값 가져오기
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj as unknown)
}

export const PAGE_SIZE_OPTIONS = [
  { value: 'all', label: '전체 보기' },
  { value: '5', label: '5개씩 보기' },
  { value: '10', label: '10개씩 보기' },
  { value: '20', label: '20개씩 보기' },
  { value: '50', label: '50개씩 보기' },
]

// Check if a single filter condition matches an item
export function matchesCondition<T>(item: T, condition: FilterCondition): boolean {
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
    case 'between': {
      if (conditionValue === null || conditionValue2 === null) return true
      const numValue = Number(value)
      return numValue >= Number(conditionValue) && numValue <= Number(conditionValue2)
    }
    case 'isEmpty':
      return value === null || value === undefined || value === ''
    case 'isNotEmpty':
      return value !== null && value !== undefined && value !== ''
    default:
      return true
  }
}
