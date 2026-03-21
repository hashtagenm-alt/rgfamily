'use client'

import { useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

interface ContentProtectionOptions {
  /** 우클릭 방지 활성화 (기본: true) */
  preventContextMenu?: boolean
  /** 드래그 방지 활성화 (기본: true) */
  preventDrag?: boolean
  /** 텍스트 선택 방지 활성화 (기본: true) */
  preventSelect?: boolean
  /** 키보드 단축키 방지 활성화 (기본: true) */
  preventKeyboardShortcuts?: boolean
  /** 인쇄 방지 활성화 (기본: true) */
  preventPrint?: boolean
  /** 개발자 도구 감지 활성화 (기본: false) */
  detectDevTools?: boolean
  /** 콘솔 경고 메시지 표시 (기본: true) */
  showConsoleWarning?: boolean
}

const defaultOptions: ContentProtectionOptions = {
  preventContextMenu: true,
  preventDrag: true,
  preventSelect: true,
  preventKeyboardShortcuts: true,
  preventPrint: true,
  detectDevTools: false,
  showConsoleWarning: true,
}

/**
 * VIP 콘텐츠 보호를 위한 커스텀 훅
 * - 우클릭 방지
 * - 드래그 방지
 * - 텍스트 선택 방지
 * - 키보드 단축키 방지 (Ctrl+S, Ctrl+U, Ctrl+Shift+I, F12 등)
 * - 인쇄 방지
 */
export function useContentProtection(options: ContentProtectionOptions = {}) {
  const mergedOptions = { ...defaultOptions, ...options }

  // 우클릭 방지
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (mergedOptions.preventContextMenu) {
      e.preventDefault()
      return false
    }
  }, [mergedOptions.preventContextMenu])

  // 드래그 방지
  const handleDragStart = useCallback((e: DragEvent) => {
    if (mergedOptions.preventDrag) {
      e.preventDefault()
      return false
    }
  }, [mergedOptions.preventDrag])

  // 텍스트 선택 방지
  const handleSelectStart = useCallback((e: Event) => {
    if (mergedOptions.preventSelect) {
      e.preventDefault()
      return false
    }
  }, [mergedOptions.preventSelect])

  // 키보드 단축키 방지
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!mergedOptions.preventKeyboardShortcuts) return

    // Ctrl+S (저장)
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      return false
    }

    // Ctrl+U (소스 보기)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault()
      return false
    }

    // Ctrl+Shift+I (개발자 도구)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      return false
    }

    // Ctrl+Shift+J (콘솔)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault()
      return false
    }

    // Ctrl+Shift+C (요소 선택)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault()
      return false
    }

    // F12 (개발자 도구)
    if (e.key === 'F12') {
      e.preventDefault()
      return false
    }

    // Ctrl+P (인쇄) - 인쇄 방지가 활성화된 경우
    if (mergedOptions.preventPrint && e.ctrlKey && e.key === 'p') {
      e.preventDefault()
      return false
    }
  }, [mergedOptions.preventKeyboardShortcuts, mergedOptions.preventPrint])

  // 인쇄 방지
  const handleBeforePrint = useCallback(() => {
    if (mergedOptions.preventPrint) {
      // 인쇄 시 빈 페이지 표시
      document.body.style.visibility = 'hidden'
    }
  }, [mergedOptions.preventPrint])

  const handleAfterPrint = useCallback(() => {
    if (mergedOptions.preventPrint) {
      document.body.style.visibility = 'visible'
    }
  }, [mergedOptions.preventPrint])

  useEffect(() => {
    // 콘솔 경고 메시지
    if (mergedOptions.showConsoleWarning) {
      logger.warn('이 페이지의 콘텐츠는 저작권으로 보호됩니다. 무단 복제 및 배포는 법적 처벌의 대상이 됩니다.')
    }

    // 이벤트 리스너 등록
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)

    // CSS로 선택 방지
    if (mergedOptions.preventSelect) {
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
    }

    // 클린업
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)

      // CSS 복원
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }
  }, [
    handleContextMenu,
    handleDragStart,
    handleSelectStart,
    handleKeyDown,
    handleBeforePrint,
    handleAfterPrint,
    mergedOptions.preventSelect,
    mergedOptions.showConsoleWarning,
  ])
}

export default useContentProtection
