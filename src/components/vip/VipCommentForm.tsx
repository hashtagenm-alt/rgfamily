'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, X, Loader2 } from 'lucide-react'
import styles from './VipCommentForm.module.css'

interface VipCommentFormProps {
  onSubmit: (content: string) => Promise<boolean>
  isSubmitting?: boolean
  placeholder?: string
  isReply?: boolean
  onCancel?: () => void
}

export default function VipCommentForm({
  onSubmit,
  isSubmitting = false,
  placeholder = '댓글을 입력하세요...',
  isReply = false,
  onCancel,
}: VipCommentFormProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const maxLength = 500

  // 자동 포커스 (답글인 경우)
  useEffect(() => {
    if (isReply && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isReply])

  // textarea 높이 자동 조절
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setContent(value)
      adjustHeight()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    const success = await onSubmit(content.trim())
    if (success) {
      setContent('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter로 제출
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
    // Escape로 취소 (답글인 경우)
    if (e.key === 'Escape' && isReply && onCancel) {
      onCancel()
    }
  }

  return (
    <form
      className={`${styles.form} ${isReply ? styles.replyForm : ''}`}
      onSubmit={handleSubmit}
    >
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSubmitting}
          rows={1}
        />

        <div className={styles.actions}>
          {isReply && onCancel && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>

      {content.length > 0 && (
        <div className={styles.meta}>
          <span className={styles.charCount}>
            {content.length}/{maxLength}
          </span>
          <span className={styles.hint}>Ctrl+Enter로 전송</span>
        </div>
      )}
    </form>
  )
}
