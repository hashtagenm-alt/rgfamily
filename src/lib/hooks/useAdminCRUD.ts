'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSupabaseContext } from '@/lib/context'

/**
 * useAdminCRUD - Admin 페이지 CRUD 보일러플레이트 제거를 위한 제네릭 훅
 *
 * 기능:
 * - Supabase CRUD 작업 (fetch, add, update, delete)
 * - 모달 상태 관리 (isModalOpen, isNew, editingItem)
 * - 로딩 상태 관리
 * - camelCase ↔ snake_case 필드 매핑
 *
 * 사용 예:
 * ```tsx
 * const {
 *   items,
 *   isLoading,
 *   isModalOpen,
 *   isNew,
 *   editingItem,
 *   openAddModal,
 *   openEditModal,
 *   closeModal,
 *   handleSave,
 *   handleDelete,
 *   setEditingItem,
 * } = useAdminCRUD<Season>({
 *   tableName: 'seasons',
 *   defaultItem: { name: '', startDate: '', isActive: false },
 *   orderBy: { column: 'start_date', ascending: false },
 *   toDbFormat: (item) => ({ name: item.name, start_date: item.startDate }),
 *   fromDbFormat: (row) => ({ id: row.id, name: row.name, startDate: row.start_date }),
 * })
 * ```
 */

// FK 제약 조건 에러를 친절한 메시지로 변환
function getFriendlyErrorMessage(error: { message?: string; code?: string }, tableName: string): string {
  const message = error.message || ''

  // FK 제약 조건 위반 (23503)
  if (error.code === '23503' || message.includes('foreign key constraint')) {
    // 테이블별 맞춤 메시지
    const fkMessages: Record<string, Record<string, string>> = {
      seasons: {
        donations_season_id_fkey: '이 시즌에 후원 기록이 있어\n삭제할 수 없습니다.\n\n먼저 후원 기록을 삭제하거나\n다른 시즌으로 이동해주세요.',
        episodes_season_id_fkey: '이 시즌에 에피소드(직급전)가 있어\n삭제할 수 없습니다.\n\n먼저 에피소드를 삭제해주세요.',
      },
      organization: {
        donations_donor_id_fkey: '이 멤버에게 연결된 후원 기록이 있어\n삭제할 수 없습니다.',
        signature_videos_member_id_fkey: '이 멤버의 시그니처 영상이 있어\n삭제할 수 없습니다.',
      },
      signatures: {
        signature_videos_signature_id_fkey: '이 시그니처에 등록된 영상이 있어\n삭제할 수 없습니다.',
      },
      episodes: {
        donations_episode_id_fkey: '이 에피소드에 후원 기록이 있어\n삭제할 수 없습니다.\n\n먼저 후원 기록에서 에피소드 연결을 해제하거나\n삭제해주세요.',
        vip_rewards_episode_id_fkey: '이 에피소드에 VIP 보상 기록이 있어\n삭제할 수 없습니다.\n\n먼저 VIP 보상 데이터를 삭제해주세요.',
      },
    }

    // 해당 테이블의 FK 메시지 찾기
    const tableMessages = fkMessages[tableName]
    if (tableMessages) {
      for (const [constraint, friendlyMsg] of Object.entries(tableMessages)) {
        if (message.includes(constraint)) {
          return friendlyMsg
        }
      }
    }

    // 일반적인 FK 에러 메시지
    return '연관된 데이터가 있어\n삭제할 수 없습니다.\n\n먼저 연관 데이터를 삭제해주세요.'
  }

  // 기타 에러
  return `삭제에 실패했습니다: ${message || error.code || '알 수 없는 오류'}`
}

export interface AlertHandler {
  showError: (message: string, title?: string) => void
  showSuccess: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  showConfirm: (
    message: string,
    options?: {
      title?: string
      variant?: 'danger' | 'warning' | 'info'
      confirmText?: string
      cancelText?: string
    }
  ) => Promise<boolean>
}

export interface AdminCRUDConfig<T extends { id?: number | string }> {
  /** Supabase 테이블 이름 */
  tableName: string

  /** 새 항목 추가 시 기본값 */
  defaultItem: Partial<T>

  /** 정렬 설정 (선택) */
  orderBy?: {
    column: string
    ascending?: boolean
  }

  /** 커스텀 select 쿼리 (선택, 기본값: '*') - 조인이 필요한 경우 사용 */
  selectQuery?: string

  /** DB 행 → 프론트엔드 객체 변환 */
  fromDbFormat: (row: Record<string, unknown>) => T

  /** 프론트엔드 객체 → DB 행 변환 (id 제외) */
  toDbFormat: (item: Partial<T>) => Record<string, unknown>

  /** 저장 전 유효성 검사 (선택) */
  validate?: (item: Partial<T>) => string | null

  /** 저장 전 추가 작업 (선택, 예: 다른 행 업데이트) */
  beforeSave?: (item: Partial<T>, isNew: boolean) => Promise<void>

  /** 삭제 전 추가 작업 (선택, 예: 연관 데이터 삭제) */
  beforeDelete?: (item: T) => Promise<void>

  /** 삭제 확인 메시지 (선택) */
  deleteConfirmMessage?: string

  /** 커스텀 Alert 핸들러 (선택, 미설정 시 기본 alert 사용) */
  alertHandler?: AlertHandler
}

export interface AdminCRUDReturn<T extends { id?: number | string }> {
  /** 아이템 목록 */
  items: T[]

  /** 로딩 상태 */
  isLoading: boolean

  /** 모달 열림 상태 */
  isModalOpen: boolean

  /** 새 항목 추가 모드 */
  isNew: boolean

  /** 현재 편집 중인 아이템 */
  editingItem: Partial<T> | null

  /** 편집 아이템 업데이트 */
  setEditingItem: React.Dispatch<React.SetStateAction<Partial<T> | null>>

  /** 추가 모달 열기 */
  openAddModal: () => void

  /** 수정 모달 열기 */
  openEditModal: (item: T) => void

  /** 모달 닫기 */
  closeModal: () => void

  /** 저장 (추가/수정) */
  handleSave: () => Promise<boolean>

  /** 삭제 */
  handleDelete: (item: T) => Promise<boolean>

  /** 데이터 새로고침 */
  refetch: () => Promise<void>
}

export function useAdminCRUD<T extends { id?: number | string }>(
  config: AdminCRUDConfig<T>
): AdminCRUDReturn<T> {
  const {
    tableName,
    defaultItem,
    orderBy,
    selectQuery = '*',
    fromDbFormat,
    toDbFormat,
    validate,
    beforeSave,
    beforeDelete,
    deleteConfirmMessage = '정말 삭제하시겠습니까?',
    alertHandler,
  } = config

  // Alert 함수 (커스텀 핸들러 또는 기본 alert/confirm)
  const showError = alertHandler?.showError || ((msg: string) => alert(msg))
  const showWarning = alertHandler?.showWarning || ((msg: string) => alert(msg))
  const showConfirm = alertHandler?.showConfirm || ((msg: string) => Promise.resolve(confirm(msg)))

  const supabase = useSupabaseContext()

  // State
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<T> | null>(null)
  const [isNew, setIsNew] = useState(false)

  // Store config refs to avoid infinite loop
  const fromDbFormatRef = React.useRef(fromDbFormat)
  const orderByRef = React.useRef(orderBy)
  const selectQueryRef = React.useRef(selectQuery)

  // Update refs in effect to avoid "Cannot access refs during render" error
  React.useEffect(() => {
    fromDbFormatRef.current = fromDbFormat
    orderByRef.current = orderBy
    selectQueryRef.current = selectQuery
  }, [fromDbFormat, orderBy, selectQuery])

  // Fetch items
  const refetch = useCallback(async () => {
    setIsLoading(true)

    let query = supabase.from(tableName).select(selectQueryRef.current)

    if (orderByRef.current) {
      query = query.order(orderByRef.current.column, { ascending: orderByRef.current.ascending ?? true })
    }

    const { data, error } = await query

    if (error) {
      console.error(`${tableName} 데이터 로드 실패:`, error)
    } else if (data) {
      // Type assertion for custom select queries
      const rows = data as unknown as Record<string, unknown>[]
      setItems(rows.map(fromDbFormatRef.current))
    }

    setIsLoading(false)
  }, [supabase, tableName])

  // Initial fetch
  useEffect(() => {
    refetch()
  }, [refetch])

  // Modal handlers
  const openAddModal = useCallback(() => {
    setEditingItem({ ...defaultItem })
    setIsNew(true)
    setIsModalOpen(true)
  }, [defaultItem])

  const openEditModal = useCallback((item: T) => {
    setEditingItem({ ...item })
    setIsNew(false)
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingItem(null)
  }, [])

  // Save handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!editingItem) return false

    // Validation
    if (validate) {
      const error = validate(editingItem)
      if (error) {
        showWarning(error, '입력 오류')
        return false
      }
    }

    // Before save hook
    if (beforeSave) {
      try {
        await beforeSave(editingItem, isNew)
      } catch (err) {
        console.error('beforeSave 실패:', err)
        return false
      }
    }

    const dbData = toDbFormat(editingItem)

    if (isNew) {
      const { error } = await supabase.from(tableName).insert(dbData)
      if (error) {
        console.error(`${tableName} 등록 실패:`, error, 'code:', error.code, 'details:', error.details, 'hint:', error.hint)
        // FK 오류인 경우 친절한 메시지
        if (error.code === '23503') {
          showError('선택한 항목이 존재하지 않습니다.\n데이터를 다시 확인해주세요.', '등록 실패')
        } else if (error.code === '23505') {
          showError('이미 동일한 데이터가 존재합니다.', '중복 오류')
        } else {
          showError(`등록에 실패했습니다: ${error.message || error.code}`, '오류')
        }
        return false
      }
    } else {
      const { error } = await supabase
        .from(tableName)
        .update(dbData)
        .eq('id', editingItem.id)
      if (error) {
        console.error(`${tableName} 수정 실패:`, error)
        showError('수정에 실패했습니다.', '오류')
        return false
      }
    }

    closeModal()
    await refetch()
    return true
  }, [supabase, tableName, editingItem, isNew, toDbFormat, validate, beforeSave, closeModal, refetch])

  // Delete handler
  const handleDelete = useCallback(async (item: T): Promise<boolean> => {
    const confirmed = await showConfirm(deleteConfirmMessage, {
      title: '삭제 확인',
      variant: 'danger',
      confirmText: '삭제',
      cancelText: '취소',
    })
    if (!confirmed) return false

    // Before delete hook (예: 연관 데이터 삭제)
    if (beforeDelete) {
      try {
        await beforeDelete(item)
      } catch (err) {
        console.error('beforeDelete 실패:', err)
        showError(`삭제 전처리에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`, '오류')
        return false
      }
    }

    console.log(`[handleDelete] Deleting ${tableName} id: ${item.id}`)
    const { error, status, statusText } = await supabase.from(tableName).delete().eq('id', item.id)
    console.log(`[handleDelete] Result - status: ${status}, statusText: ${statusText}, error:`, error)

    if (error) {
      console.error(`${tableName} 삭제 실패:`, error, `code: ${error.code}, details: ${error.details}, hint: ${error.hint}`)

      // FK 제약 조건 에러 친절한 메시지로 변환
      const friendlyMessage = getFriendlyErrorMessage(error, tableName)
      showError(friendlyMessage, '삭제 불가')
      return false
    }

    await refetch()
    return true
  }, [supabase, tableName, deleteConfirmMessage, beforeDelete, refetch, showConfirm, showError])

  return {
    items,
    isLoading,
    isModalOpen,
    isNew,
    editingItem,
    setEditingItem,
    openAddModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
    refetch,
  }
}

export default useAdminCRUD
