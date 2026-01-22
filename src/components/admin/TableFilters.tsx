'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X, Plus, Calendar, ChevronDown } from 'lucide-react'
import styles from './TableFilters.module.css'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'text' | 'number' | 'date' | 'dateRange' | 'boolean'
  options?: FilterOption[]
}

export interface FilterCondition {
  id: string
  field: string
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'isEmpty' | 'isNotEmpty'
  value: string | number | boolean | null
  value2?: string | number | null // For 'between' operator
}

interface TableFiltersProps {
  filters: FilterConfig[]
  conditions: FilterCondition[]
  onChange: (conditions: FilterCondition[]) => void
  logicOperator: 'AND' | 'OR'
  onLogicChange: (logic: 'AND' | 'OR') => void
}

const operatorLabels: Record<string, string> = {
  equals: '같음',
  contains: '포함',
  gt: '초과',
  lt: '미만',
  gte: '이상',
  lte: '이하',
  between: '범위',
  isEmpty: '비어있음',
  isNotEmpty: '비어있지 않음',
}

const getOperatorsForType = (type: FilterConfig['type']): string[] => {
  switch (type) {
    case 'select':
    case 'boolean':
      return ['equals']
    case 'text':
      return ['equals', 'contains', 'isEmpty', 'isNotEmpty']
    case 'number':
      return ['equals', 'gt', 'lt', 'gte', 'lte', 'between']
    case 'date':
    case 'dateRange':
      return ['equals', 'gt', 'lt', 'gte', 'lte', 'between']
    default:
      return ['equals']
  }
}

export default function TableFilters({
  filters,
  conditions,
  onChange,
  logicOperator,
  onLogicChange,
}: TableFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(conditions.length > 0)

  const generateId = () => Math.random().toString(36).substring(2, 9)

  const addCondition = useCallback(() => {
    if (filters.length === 0) return

    const newCondition: FilterCondition = {
      id: generateId(),
      field: filters[0].key,
      operator: 'equals',
      value: null,
    }
    onChange([...conditions, newCondition])
    setIsExpanded(true)
  }, [filters, conditions, onChange])

  const updateCondition = useCallback(
    (id: string, updates: Partial<FilterCondition>) => {
      onChange(
        conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
      )
    },
    [conditions, onChange]
  )

  const removeCondition = useCallback(
    (id: string) => {
      const newConditions = conditions.filter((c) => c.id !== id)
      onChange(newConditions)
      if (newConditions.length === 0) setIsExpanded(false)
    },
    [conditions, onChange]
  )

  const clearAll = useCallback(() => {
    onChange([])
    setIsExpanded(false)
  }, [onChange])

  const activeCount = useMemo(
    () => conditions.filter((c) => c.value !== null || c.operator === 'isEmpty' || c.operator === 'isNotEmpty').length,
    [conditions]
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={`${styles.toggleBtn} ${activeCount > 0 ? styles.active : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter size={16} />
          <span>필터</span>
          {activeCount > 0 && (
            <span className={styles.badge}>{activeCount}</span>
          )}
          <ChevronDown
            size={14}
            className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}
          />
        </button>

        {activeCount > 0 && (
          <button className={styles.clearBtn} onClick={clearAll}>
            <X size={14} />
            초기화
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {conditions.length > 1 && (
              <div className={styles.logicSelector}>
                <span className={styles.logicLabel}>조건 연결:</span>
                <div className={styles.logicButtons}>
                  <button
                    className={`${styles.logicBtn} ${logicOperator === 'AND' ? styles.active : ''}`}
                    onClick={() => onLogicChange('AND')}
                  >
                    AND (모두 만족)
                  </button>
                  <button
                    className={`${styles.logicBtn} ${logicOperator === 'OR' ? styles.active : ''}`}
                    onClick={() => onLogicChange('OR')}
                  >
                    OR (하나라도 만족)
                  </button>
                </div>
              </div>
            )}

            <div className={styles.conditions}>
              {conditions.map((condition, index) => {
                const filterConfig = filters.find((f) => f.key === condition.field)
                const operators = filterConfig ? getOperatorsForType(filterConfig.type) : ['equals']

                return (
                  <motion.div
                    key={condition.id}
                    className={styles.conditionRow}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    {index > 0 && (
                      <span className={styles.connector}>{logicOperator}</span>
                    )}

                    {/* Field Select */}
                    <select
                      className={styles.select}
                      value={condition.field}
                      onChange={(e) => {
                        const newField = e.target.value
                        const newConfig = filters.find((f) => f.key === newField)
                        const newOperators = newConfig ? getOperatorsForType(newConfig.type) : ['equals']
                        updateCondition(condition.id, {
                          field: newField,
                          operator: newOperators[0] as FilterCondition['operator'],
                          value: null,
                          value2: undefined,
                        })
                      }}
                    >
                      {filters.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator Select */}
                    <select
                      className={styles.select}
                      value={condition.operator}
                      onChange={(e) =>
                        updateCondition(condition.id, {
                          operator: e.target.value as FilterCondition['operator'],
                          value: null,
                          value2: undefined,
                        })
                      }
                    >
                      {operators.map((op) => (
                        <option key={op} value={op}>
                          {operatorLabels[op]}
                        </option>
                      ))}
                    </select>

                    {/* Value Input */}
                    {condition.operator !== 'isEmpty' && condition.operator !== 'isNotEmpty' && (
                      <>
                        {filterConfig?.type === 'select' && filterConfig.options ? (
                          <select
                            className={styles.select}
                            value={(condition.value as string) || ''}
                            onChange={(e) =>
                              updateCondition(condition.id, { value: e.target.value })
                            }
                          >
                            <option value="">선택...</option>
                            {filterConfig.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : filterConfig?.type === 'boolean' ? (
                          <select
                            className={styles.select}
                            value={condition.value === null ? '' : String(condition.value)}
                            onChange={(e) =>
                              updateCondition(condition.id, {
                                value: e.target.value === '' ? null : e.target.value === 'true',
                              })
                            }
                          >
                            <option value="">선택...</option>
                            <option value="true">예</option>
                            <option value="false">아니오</option>
                          </select>
                        ) : filterConfig?.type === 'date' || filterConfig?.type === 'dateRange' ? (
                          <div className={styles.dateInputs}>
                            <div className={styles.dateInputWrapper}>
                              <Calendar size={14} className={styles.dateIcon} />
                              <input
                                type="date"
                                className={styles.input}
                                value={(condition.value as string) || ''}
                                onChange={(e) =>
                                  updateCondition(condition.id, { value: e.target.value })
                                }
                              />
                            </div>
                            {condition.operator === 'between' && (
                              <>
                                <span className={styles.dateConnector}>~</span>
                                <div className={styles.dateInputWrapper}>
                                  <Calendar size={14} className={styles.dateIcon} />
                                  <input
                                    type="date"
                                    className={styles.input}
                                    value={(condition.value2 as string) || ''}
                                    onChange={(e) =>
                                      updateCondition(condition.id, { value2: e.target.value })
                                    }
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        ) : filterConfig?.type === 'number' ? (
                          <div className={styles.numberInputs}>
                            <input
                              type="number"
                              className={styles.input}
                              placeholder="값 입력..."
                              value={condition.value === null ? '' : String(condition.value)}
                              onChange={(e) =>
                                updateCondition(condition.id, {
                                  value: e.target.value === '' ? null : Number(e.target.value),
                                })
                              }
                            />
                            {condition.operator === 'between' && (
                              <>
                                <span className={styles.numberConnector}>~</span>
                                <input
                                  type="number"
                                  className={styles.input}
                                  placeholder="값 입력..."
                                  value={condition.value2 === null || condition.value2 === undefined ? '' : String(condition.value2)}
                                  onChange={(e) =>
                                    updateCondition(condition.id, {
                                      value2: e.target.value === '' ? null : Number(e.target.value),
                                    })
                                  }
                                />
                              </>
                            )}
                          </div>
                        ) : (
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="검색어 입력..."
                            value={(condition.value as string) || ''}
                            onChange={(e) =>
                              updateCondition(condition.id, { value: e.target.value })
                            }
                          />
                        )}
                      </>
                    )}

                    {/* Remove Button */}
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeCondition(condition.id)}
                      title="조건 삭제"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                )
              })}
            </div>

            <button className={styles.addBtn} onClick={addCondition}>
              <Plus size={14} />
              조건 추가
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
