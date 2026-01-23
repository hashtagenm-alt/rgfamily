'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Eye, Calendar, User, MessageSquare, Send, Trash2, Edit } from 'lucide-react'
import { deletePost } from '@/lib/actions/posts'
import { useSupabaseContext, useAuthContext } from '@/lib/context'
import { formatDate } from '@/lib/utils/format'
import type { JoinedProfile } from '@/types/common'
import styles from './page.module.css'

interface PostDetail {
  id: number
  title: string
  content: string
  authorId: string
  authorName: string
  authorRealName?: string
  authorAvatar: string | null
  viewCount: number
  createdAt: string
  isAnonymous: boolean
}

interface Comment {
  id: number
  content: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  createdAt: string
}

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>
}) {
  const { category, id } = use(params)
  const router = useRouter()

  // ID가 유효한 숫자인지 검증
  const postId = parseInt(id)
  if (isNaN(postId) || postId <= 0) {
    notFound()
  }

  // category가 유효한 게시판 타입인지 검증
  if (!['free', 'vip'].includes(category)) {
    notFound()
  }
  const supabase = useSupabaseContext()
  const { user, profile } = useAuthContext()
  const isAdmin = ['admin', 'superadmin', 'moderator'].includes(profile?.role ?? '')
  const [post, setPost] = useState<PostDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 삭제 권한 확인 (작성자 또는 관리자)
  const canDelete = user && post && (user.id === post.authorId || isAdmin)
  const canEdit = user && post && user.id === post.authorId

  const fetchPost = useCallback(async () => {
    setIsLoading(true)

    // 게시글 조회
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select('*, profiles!author_id(id, nickname, avatar_url)')
      .eq('id', postId)
      .single()

    if (postError || !postData) {
      console.error('게시글 로드 실패:', postError)
      setIsLoading(false)
      return
    }

    // 조회수 증가
    await supabase
      .from('posts')
      .update({ view_count: (postData.view_count || 0) + 1 })
      .eq('id', postId)

    const postProfile = postData.profiles as JoinedProfile | null
    const isAnonymous = Boolean(postData.is_anonymous)
    const realNickname = postProfile?.nickname || '알 수 없음'
    setPost({
      id: postData.id,
      title: postData.title,
      content: postData.content || '',
      authorId: postData.author_id,
      authorName: isAnonymous ? '익명' : realNickname,
      authorRealName: isAnonymous ? realNickname : undefined,
      authorAvatar: !isAnonymous || isAdmin ? (postProfile?.avatar_url || null) : null,
      viewCount: (postData.view_count || 0) + 1,
      createdAt: postData.created_at,
      isAnonymous,
    })

    // 댓글 조회
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, profiles!author_id(id, nickname, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    setComments(
      (commentsData || []).map((c) => {
        const commentProfile = c.profiles as JoinedProfile | null
        return {
          id: c.id,
          content: c.content,
          authorId: c.author_id,
          authorName: commentProfile?.nickname || '익명',
          authorAvatar: commentProfile?.avatar_url || null,
          createdAt: c.created_at,
        }
      })
    )

    setIsLoading(false)
  }, [supabase, postId])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    setIsSubmitting(true)

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: user.id,
      content: newComment.trim(),
    })

    if (error) {
      console.error('댓글 작성 실패:', error)
      alert('댓글 작성에 실패했습니다.')
    } else {
      setNewComment('')
      fetchPost() // 댓글 새로고침
    }

    setIsSubmitting(false)
  }


  const getCategoryLabel = () => {
    return category === 'vip' ? 'VIP 라운지' : '자유게시판'
  }

  // 게시글 삭제 핸들러
  const handleDelete = async () => {
    if (!post) return

    const confirmMessage = isAdmin && user?.id !== post.authorId
      ? '관리자 권한으로 이 게시글을 삭제하시겠습니까?'
      : '이 게시글을 삭제하시겠습니까?'

    if (!confirm(confirmMessage)) return

    setIsDeleting(true)
    const result = await deletePost(post.id)

    if (result.error) {
      alert(result.error)
      setIsDeleting(false)
    } else {
      alert('게시글이 삭제되었습니다.')
      router.push(`/community/${category}`)
    }
  }

  if (isLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>게시글을 불러오는 중...</span>
        </div>
      </main>
    )
  }

  if (!post) {
    return (
      <main className={styles.main}>
        <div className={styles.empty}>
          <p>게시글을 찾을 수 없습니다</p>
          <Link href={`/community/${category}`} className={styles.backLink}>
            목록으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            <ArrowLeft size={20} />
            <span>{getCategoryLabel()}</span>
          </button>
        </header>

        {/* Article */}
        <article className={styles.article}>
          {/* Title Area */}
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{post.title}</h1>
              {/* 수정/삭제 버튼 */}
              {(canEdit || canDelete) && (
                <div className={styles.postActions}>
                  {canEdit && (
                    <Link
                      href={`/community/write?edit=${post.id}&board=${category}`}
                      className={styles.editButton}
                    >
                      <Edit size={16} />
                      <span>수정</span>
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className={styles.deleteButton}
                    >
                      <Trash2 size={16} />
                      <span>{isDeleting ? '삭제 중...' : '삭제'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className={styles.meta}>
              <div className={styles.author}>
                <div className={styles.authorAvatar}>
                  {post.authorAvatar ? (
                    <Image
                      src={post.authorAvatar}
                      alt={post.authorName}
                      fill
                      className={styles.avatarImage}
                    />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <span>{post.authorName}</span>
                {isAdmin && post.isAnonymous && post.authorRealName && (
                  <span className={styles.adminRealName}>({post.authorRealName})</span>
                )}
              </div>
              <div className={styles.metaItems}>
                <span>
                  <Calendar size={14} />
                  {formatDate(post.createdAt)}
                </span>
                <span>
                  <Eye size={14} />
                  {post.viewCount}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {post.content.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph || '\u00A0'}</p>
            ))}
          </div>
        </article>

        {/* Comments */}
        <section className={styles.comments}>
          <h2 className={styles.commentsHeader}>
            <MessageSquare size={20} />
            댓글 {comments.length}
          </h2>

          {/* Comment Form */}
          {user ? (
            <form onSubmit={handleSubmitComment} className={styles.commentForm}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className={styles.commentInput}
                rows={3}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className={styles.submitButton}
              >
                <Send size={16} />
                등록
              </button>
            </form>
          ) : (
            <div className={styles.loginPrompt}>
              <p>댓글을 작성하려면 로그인이 필요합니다.</p>
              <Link href="/login" className={styles.loginLink}>로그인</Link>
            </div>
          )}

          {/* Comments List */}
          <div className={styles.commentsList}>
            {comments.length === 0 ? (
              <p className={styles.noComments}>첫 댓글을 작성해보세요!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className={styles.commentItem}>
                  <div className={styles.commentAuthor}>
                    <div className={styles.commentAvatar}>
                      {comment.authorAvatar ? (
                        <Image
                          src={comment.authorAvatar}
                          alt={comment.authorName}
                          fill
                          className={styles.avatarImage}
                        />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <span className={styles.commentAuthorName}>{comment.authorName}</span>
                    <span className={styles.commentDate}>
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className={styles.commentContent}>{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <Link href={`/community/${category}`} className={styles.listButton}>
            목록으로
          </Link>
        </footer>
      </div>
    </main>
  )
}
