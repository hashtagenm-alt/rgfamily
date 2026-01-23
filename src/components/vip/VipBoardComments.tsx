'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  CornerDownRight,
  Trash2,
  Crown,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { useVipMessageComments } from '@/lib/hooks'
import { useAuthContext } from '@/lib/context'
import VipCommentForm from './VipCommentForm'
import type { VipMessageCommentWithAuthor } from '@/types/database'
import styles from './VipBoardComments.module.css'

interface VipBoardCommentsProps {
  messageId: number
  vipNickname: string
  onCommentCountChange?: () => void
}

export default function VipBoardComments({
  messageId,
  vipNickname,
  onCommentCountChange,
}: VipBoardCommentsProps) {
  const { user, profile } = useAuthContext()
  const {
    comments,
    isLoading,
    hasMore,
    addComment,
    removeComment,
    loadMore,
    canComment,
    isSubmitting,
  } = useVipMessageComments(messageId)

  const [replyToId, setReplyToId] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // 1분 이내
    if (diff < 60 * 1000) {
      return '방금 전'
    }
    // 1시간 이내
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}분 전`
    }
    // 24시간 이내
    if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`
    }
    // 7일 이내
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (24 * 60 * 60 * 1000))}일 전`
    }
    // 그 외
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    })
  }

  const handleSubmitComment = async (content: string, parentId?: number | null) => {
    const success = await addComment(content, parentId)
    if (success) {
      setReplyToId(null)
      onCommentCountChange?.()
    }
    return success
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) return

    const success = await removeComment(commentId)
    if (success) {
      onCommentCountChange?.()
    }
  }

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    await loadMore()
    setIsLoadingMore(false)
  }

  const getRoleBadge = (role?: string) => {
    if (role === 'vip') {
      return (
        <span className={styles.vipBadge} title="VIP">
          <Crown size={10} />
        </span>
      )
    }
    if (role === 'admin' || role === 'superadmin') {
      return <span className={styles.adminBadge}>관리자</span>
    }
    if (role === 'moderator') {
      return <span className={styles.modBadge}>스태프</span>
    }
    return null
  }

  const renderComment = (comment: VipMessageCommentWithAuthor, isReply = false) => {
    const canDelete = user?.id === comment.author_id || isAdmin

    return (
      <motion.div
        key={comment.id}
        className={`${styles.comment} ${isReply ? styles.reply : ''}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className={styles.commentHeader}>
          {comment.author?.avatar_url ? (
            <Image
              src={comment.author.avatar_url}
              alt={comment.author.nickname || '사용자'}
              width={isReply ? 28 : 32}
              height={isReply ? 28 : 32}
              className={styles.commentAvatar}
            />
          ) : (
            <div className={`${styles.commentAvatarPlaceholder} ${isReply ? styles.smallAvatar : ''}`}>
              {(comment.author?.nickname || '?').charAt(0)}
            </div>
          )}
          <div className={styles.commentInfo}>
            <div className={styles.commentNameRow}>
              <span className={styles.commentName}>
                {comment.author?.nickname || '알 수 없음'}
              </span>
              {getRoleBadge(comment.author?.role)}
            </div>
            <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
          </div>

          <div className={styles.commentActions}>
            {!isReply && canComment && (
              <button
                className={styles.replyBtn}
                onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
              >
                <CornerDownRight size={14} />
                <span>답글</span>
              </button>
            )}
            {canDelete && (
              <button
                className={styles.deleteCommentBtn}
                onClick={() => handleDeleteComment(comment.id)}
                title="삭제"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <p className={styles.commentContent}>{comment.content}</p>

        {/* 답글 입력 폼 */}
        {replyToId === comment.id && (
          <div className={styles.replyFormWrapper}>
            <VipCommentForm
              onSubmit={(content) => handleSubmitComment(content, comment.id)}
              isSubmitting={isSubmitting}
              placeholder={`${comment.author?.nickname || ''}님에게 답글...`}
              isReply
              onCancel={() => setReplyToId(null)}
            />
          </div>
        )}

        {/* 대댓글 목록 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className={styles.repliesList}>
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.commentsSection}>
        <div className={styles.loading}>
          <Loader2 size={18} className={styles.spinner} />
          <span>댓글을 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.commentsSection}>
      {/* 댓글 입력 폼 */}
      {canComment ? (
        <VipCommentForm
          onSubmit={(content) => handleSubmitComment(content)}
          isSubmitting={isSubmitting}
          placeholder="댓글을 입력하세요..."
        />
      ) : (
        <div className={styles.loginPrompt}>
          <MessageSquare size={16} />
          <span>댓글을 작성하려면 로그인이 필요합니다</span>
        </div>
      )}

      {/* 댓글 목록 */}
      {comments.length > 0 ? (
        <div className={styles.commentsList}>
          {comments.map((comment) => renderComment(comment))}
        </div>
      ) : (
        <div className={styles.noComments}>
          <MessageSquare size={20} />
          <span>아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</span>
        </div>
      )}

      {/* 더 불러오기 */}
      {hasMore && (
        <button
          className={styles.loadMoreBtn}
          onClick={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <Loader2 size={14} className={styles.spinner} />
              <span>불러오는 중...</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>이전 댓글 더 보기</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
