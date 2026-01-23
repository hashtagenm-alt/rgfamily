'use client'

/**
 * 관리자 플로팅 액션 버튼 (FAB) 컴포넌트
 *
 * 관리자일 때만 표시되는 오른쪽 하단 플로팅 버튼
 * AdminScheduleOverlay 패턴을 일반화
 */

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Plus, LucideIcon } from 'lucide-react'
import { useAuthContext } from '@/lib/context/AuthContext'
import styles from './AdminInlineOverlay.module.css'

interface AdminInlineOverlayProps {
  onClick: () => void
  icon?: LucideIcon
  title?: string
  children?: ReactNode
}

export default function AdminInlineOverlay({
  onClick,
  icon: Icon = Plus,
  title = '추가',
  children,
}: AdminInlineOverlayProps) {
  const { isAdmin } = useAuthContext()

  // 관리자 아니면 렌더링 안 함
  if (!isAdmin()) return null

  return (
    <>
      {/* 플로팅 추가 버튼 */}
      <motion.button
        className={styles.floatingAddBtn}
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        title={title}
      >
        <Icon size={24} />
      </motion.button>

      {/* 추가 컨텐츠 (모달 등) */}
      {children}
    </>
  )
}

/**
 * 인라인 액션 버튼 (호버 시 표시되는 아이콘 버튼)
 */
interface AdminActionButtonProps {
  onClick: (e: React.MouseEvent) => void
  icon: LucideIcon
  title: string
  variant?: 'default' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
}

export function AdminActionButton({
  onClick,
  icon: Icon,
  title,
  variant = 'default',
  size = 'md',
  disabled = false,
}: AdminActionButtonProps) {
  const { isAdmin } = useAuthContext()

  if (!isAdmin()) return null

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      onClick(e)
    }
  }

  return (
    <button
      type="button"
      className={`${styles.actionBtn} ${styles[variant]} ${styles[size]}`}
      onClick={handleClick}
      title={title}
      disabled={disabled}
    >
      <Icon size={size === 'sm' ? 14 : 16} />
    </button>
  )
}

/**
 * 인라인 액션 버튼 그룹
 */
interface AdminActionGroupProps {
  children: ReactNode
  className?: string
}

export function AdminActionGroup({ children, className }: AdminActionGroupProps) {
  const { isAdmin } = useAuthContext()

  if (!isAdmin()) return null

  return (
    <div className={`${styles.actionGroup} ${className || ''}`}>
      {children}
    </div>
  )
}
