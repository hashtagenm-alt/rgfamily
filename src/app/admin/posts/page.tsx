'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Eye, Plus, X, Save, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { DataTable, Column, AdminModal } from '@/components/admin'
import { useSupabaseContext } from '@/lib/context'
import { useAlert } from '@/lib/hooks'
import type { JoinedProfile } from '@/types/common'
import styles from '../shared.module.css'

interface Post {
  id: number
  title: string
  content: string
  authorId: string
  authorName: string
  boardType: 'free' | 'vip'
  viewCount: number
  commentCount: number
  isAnonymous: boolean
  createdAt: string
}

interface Comment {
  id: number
  content: string
  authorName: string
  createdAt: string
}

export default function PostsPage() {
  const supabase = useSupabaseContext()
  const { showConfirm, showError, showSuccess } = useAlert()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<'all' | 'free' | 'vip'>('all')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [editingPost, setEditingPost] = useState<Partial<Post> | null>(null)

  // Comments accordion state
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)

  const fetchPosts = useCallback(async () => {
    setIsLoading(true)

    let query = supabase
      .from('posts')
      .select('*, profiles!author_id(nickname), comments(id)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (activeCategory !== 'all') {
      query = query.eq('board_type', activeCategory)
    }

    const { data, error } = await query

    if (error) {
      console.error('게시글 데이터 로드 실패:', error)
    } else {
      setPosts(
        (data || []).map((p) => {
          const profile = p.profiles as JoinedProfile | null
          const commentsArr = p.comments as unknown[] | null
          return {
            id: p.id,
            title: p.title,
            content: p.content,
            authorId: p.author_id,
            authorName: profile?.nickname || '익명',
            boardType: p.board_type,
            viewCount: p.view_count || 0,
            commentCount: commentsArr?.length || 0,
            isAnonymous: p.is_anonymous || false,
            createdAt: p.created_at,
          }
        })
      )
    }

    setIsLoading(false)
  }, [supabase, activeCategory])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // Fetch comments for a post
  const fetchComments = useCallback(async (postId: number) => {
    setLoadingComments(true)
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles!author_id(nickname)')
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('댓글 로드 실패:', error)
    } else {
      setComments(
        (data || []).map((c) => {
          const profile = c.profiles as JoinedProfile | null
          return {
            id: c.id,
            content: c.content,
            authorName: c.is_anonymous ? '익명' : (profile?.nickname || '익명'),
            createdAt: c.created_at,
          }
        })
      )
    }
    setLoadingComments(false)
  }, [supabase])

  // Toggle comments accordion
  const toggleComments = (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null)
      setComments([])
    } else {
      setExpandedPostId(postId)
      fetchComments(postId)
    }
  }

  // Open add modal
  const openAddModal = () => {
    setIsNew(true)
    setEditingPost({
      title: '',
      content: '',
      boardType: activeCategory === 'all' ? 'free' : activeCategory,
      isAnonymous: false,
    })
    setIsModalOpen(true)
  }

  // Open edit modal
  const openEditModal = (post: Post) => {
    setIsNew(false)
    setEditingPost({
      id: post.id,
      title: post.title,
      content: post.content,
      boardType: post.boardType,
      isAnonymous: post.isAnonymous,
    })
    setIsModalOpen(true)
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPost(null)
  }

  // Save post (create or update)
  const handleSave = async () => {
    if (!editingPost?.title || !editingPost?.content) {
      showError('제목과 내용을 입력해주세요.')
      return
    }

    if (isNew) {
      // Admin creates post - need to get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showError('로그인이 필요합니다.')
        return
      }

      const { error } = await supabase.from('posts').insert({
        title: editingPost.title,
        content: editingPost.content,
        board_type: editingPost.boardType,
        author_id: user.id,
        is_anonymous: editingPost.isAnonymous || false,
      })

      if (error) {
        console.error('게시글 등록 실패:', error)
        showError('등록에 실패했습니다.')
        return
      }
      showSuccess('게시글이 등록되었습니다.')
    } else {
      const { error } = await supabase
        .from('posts')
        .update({
          title: editingPost.title,
          content: editingPost.content,
          board_type: editingPost.boardType,
          is_anonymous: editingPost.isAnonymous || false,
        })
        .eq('id', editingPost.id)

      if (error) {
        console.error('게시글 수정 실패:', error)
        showError('수정에 실패했습니다.')
        return
      }
      showSuccess('게시글이 수정되었습니다.')
    }

    closeModal()
    fetchPosts()
  }

  const handleDelete = async (post: Post) => {
    const confirmed = await showConfirm('정말 삭제하시겠습니까?\n\n댓글도 함께 삭제됩니다.', {
      title: '게시글 삭제',
      variant: 'danger',
      confirmText: '삭제',
      cancelText: '취소',
    })
    if (!confirmed) return

    // Soft delete
    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', post.id)

    if (error) {
      console.error('게시글 삭제 실패:', error)
      showError('삭제에 실패했습니다.')
    } else {
      showSuccess('게시글이 삭제되었습니다.')
      if (expandedPostId === post.id) {
        setExpandedPostId(null)
        setComments([])
      }
      fetchPosts()
    }
  }

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    const confirmed = await showConfirm('댓글을 삭제하시겠습니까?', {
      title: '댓글 삭제',
      variant: 'danger',
      confirmText: '삭제',
      cancelText: '취소',
    })
    if (!confirmed) return

    const { error } = await supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', commentId)

    if (error) {
      console.error('댓글 삭제 실패:', error)
      showError('삭제에 실패했습니다.')
    } else {
      showSuccess('댓글이 삭제되었습니다.')
      if (expandedPostId) {
        fetchComments(expandedPostId)
        // Update comment count in posts
        setPosts(prev => prev.map(p =>
          p.id === expandedPostId ? { ...p, commentCount: p.commentCount - 1 } : p
        ))
      }
    }
  }

  const handleView = (post: Post) => {
    window.open(`/community/${post.boardType}/${post.id}`, '_blank')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const columns: Column<Post>[] = [
    { key: 'title', header: '제목' },
    { key: 'authorName', header: '작성자', width: '120px' },
    {
      key: 'boardType',
      header: '카테고리',
      width: '100px',
      render: (item) => (
        <span className={`${styles.badge} ${item.boardType === 'vip' ? styles.badgeAdmin : ''}`}>
          {item.boardType === 'vip' ? 'VIP' : '자유'}
        </span>
      ),
    },
    {
      key: 'viewCount',
      header: '조회',
      width: '80px',
      render: (item) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Eye size={14} /> {item.viewCount}
        </span>
      ),
    },
    {
      key: 'commentCount',
      header: '댓글',
      width: '100px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleComments(item.id)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            background: expandedPostId === item.id ? 'var(--primary)' : 'var(--surface)',
            color: expandedPostId === item.id ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--card-border)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <MessageSquare size={12} />
          {item.commentCount}
          {expandedPostId === item.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      ),
    },
    {
      key: 'createdAt',
      header: '작성일',
      width: '140px',
      render: (item) => formatDate(item.createdAt),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <MessageSquare size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>게시글 관리</h1>
            <p className={styles.subtitle}>커뮤니티 게시글 관리</p>
          </div>
        </div>
        <button onClick={openAddModal} className={styles.addButton}>
          <Plus size={18} />
          게시글 작성
        </button>
      </header>

      {/* Category Tabs */}
      <div className={styles.typeSelector}>
        <button
          onClick={() => setActiveCategory('all')}
          className={`${styles.typeButton} ${activeCategory === 'all' ? styles.active : ''}`}
        >
          전체
        </button>
        <button
          onClick={() => setActiveCategory('free')}
          className={`${styles.typeButton} ${activeCategory === 'free' ? styles.active : ''}`}
        >
          자유게시판
        </button>
        <button
          onClick={() => setActiveCategory('vip')}
          className={`${styles.typeButton} ${activeCategory === 'vip' ? styles.active : ''}`}
        >
          VIP게시판
        </button>
      </div>

      <DataTable
        data={posts}
        columns={columns}
        onView={handleView}
        onEdit={openEditModal}
        onDelete={handleDelete}
        searchPlaceholder="제목 또는 작성자로 검색..."
        isLoading={isLoading}
      />

      {/* Comments Accordion */}
      <AnimatePresence>
        {expandedPostId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: '-1rem',
              background: 'var(--surface)',
              borderRadius: '0 0 12px 12px',
              border: '1px solid var(--card-border)',
              borderTop: 'none',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  댓글 목록 ({comments.length}개)
                </h3>
                <button
                  onClick={() => {
                    setExpandedPostId(null)
                    setComments([])
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.375rem 0.75rem',
                    background: 'transparent',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronUp size={14} /> 접기
                </button>
              </div>

              {loadingComments ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  댓글 로딩 중...
                </div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  댓글이 없습니다.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        background: 'var(--card-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.375rem',
                        }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                            {comment.authorName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {comment.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                        }}
                        title="댓글 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AdminModal
        isOpen={isModalOpen}
        title={isNew ? '게시글 작성' : '게시글 수정'}
        onClose={closeModal}
        onSave={handleSave}
        saveLabel={isNew ? '작성' : '저장'}
        maxWidth="600px"
      >
        <div className={styles.formGroup}>
          <label>카테고리</label>
          <div className={styles.typeSelector}>
            <button
              type="button"
              onClick={() => setEditingPost(prev => prev ? { ...prev, boardType: 'free' } : null)}
              className={`${styles.typeButton} ${editingPost?.boardType === 'free' ? styles.active : ''}`}
            >
              자유게시판
            </button>
            <button
              type="button"
              onClick={() => setEditingPost(prev => prev ? { ...prev, boardType: 'vip' } : null)}
              className={`${styles.typeButton} ${editingPost?.boardType === 'vip' ? styles.active : ''}`}
            >
              VIP게시판
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>제목</label>
          <input
            type="text"
            value={editingPost?.title || ''}
            onChange={(e) =>
              setEditingPost(prev => prev ? { ...prev, title: e.target.value } : null)
            }
            className={styles.input}
            placeholder="게시글 제목을 입력하세요"
          />
        </div>

        <div className={styles.formGroup}>
          <label>내용</label>
          <textarea
            value={editingPost?.content || ''}
            onChange={(e) =>
              setEditingPost(prev => prev ? { ...prev, content: e.target.value } : null)
            }
            className={styles.textarea}
            placeholder="게시글 내용을 입력하세요"
            rows={8}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={editingPost?.isAnonymous || false}
              onChange={(e) =>
                setEditingPost(prev => prev ? { ...prev, isAnonymous: e.target.checked } : null)
              }
              className={styles.checkbox}
            />
            익명으로 작성
          </label>
        </div>
      </AdminModal>
    </div>
  )
}
