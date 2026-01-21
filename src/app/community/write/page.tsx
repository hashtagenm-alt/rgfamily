'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, AlertCircle, FileText, Crown } from 'lucide-react'
import { PageLayout } from '@/components/layout'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { PostImageUpload } from '@/components/community/PostImageUpload'
import { useAuthContext } from '@/lib/context/AuthContext'
import { useVipStatus } from '@/lib/hooks/useVipStatus'
import { createPost } from '@/lib/actions/posts'
import styles from './page.module.css'

function WritePostContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, profile } = useAuthContext()
  const { isVip: isVipByRank, isLoading: vipLoading } = useVipStatus()

  // URL에서 게시판 타입 가져오기 (기본: free)
  const boardParam = searchParams.get('board') as 'free' | 'vip' | null
  const boardType = boardParam || 'free'

  // VIP 게시판 접근 권한 체크 (Role 기반 OR Rank 기반)
  const VIP_ROLES = ['vip', 'moderator', 'admin', 'superadmin']
  const isVipByRole = profile?.role && VIP_ROLES.includes(profile.role)
  const canAccessVip = isVipByRole || isVipByRank

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_anonymous: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 이미지 삽입 핸들러 (커서 위치에 마크다운 이미지 삽입)
  const handleImageInsert = (markdownImg: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      // textarea가 없으면 끝에 추가
      setFormData(prev => ({
        ...prev,
        content: prev.content + '\n' + markdownImg + '\n'
      }))
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = formData.content
    const newContent = text.slice(0, start) + '\n' + markdownImg + '\n' + text.slice(end)

    setFormData(prev => ({ ...prev, content: newContent }))

    // 커서 위치 조정
    setTimeout(() => {
      textarea.focus()
      const newPos = start + markdownImg.length + 2
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  // VIP 게시판 접근 권한 없으면 자유게시판으로 리다이렉트
  // VIP 상태 로딩 완료 후에만 체크
  useEffect(() => {
    if (!vipLoading && boardType === 'vip' && !canAccessVip && isAuthenticated) {
      router.replace('/community/write?board=free')
    }
  }, [boardType, canAccessVip, isAuthenticated, vipLoading, router])

  const boardInfo = {
    free: {
      name: '자유게시판',
      icon: FileText,
      description: '자유롭게 소통하는 공간입니다',
      color: 'var(--color-primary)',
    },
    vip: {
      name: 'VIP 라운지',
      icon: Crown,
      description: 'VIP 회원 전용 게시판입니다',
      color: '#ffd700',
    },
  }

  const currentBoard = boardInfo[boardType]
  const BoardIcon = currentBoard.icon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    if (formData.title.length > 100) {
      setError('제목은 100자 이내로 입력해주세요.')
      return
    }

    if (!formData.content.trim()) {
      setError('내용을 입력해주세요.')
      return
    }

    if (boardType === 'vip' && !canAccessVip) {
      setError('VIP 라운지는 VIP 등급 이상만 작성할 수 있습니다.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createPost({
        board_type: boardType,
        title: formData.title.trim(),
        content: formData.content.trim(),
        is_anonymous: formData.is_anonymous,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      // 성공 시 해당 게시판으로 이동
      router.push(`/community/${boardType}`)
    } catch {
      setError('게시글 작성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 비로그인 사용자 안내
  if (!isAuthenticated) {
    return (
      <PageLayout>
        <div className={styles.main}>
          <Navbar />
          <div className={styles.writeContainer}>
            <div className={styles.authRequired}>
              <AlertCircle size={48} />
              <h2>로그인이 필요합니다</h2>
              <p>게시글을 작성하려면 먼저 로그인해주세요.</p>
              <div className={styles.authButtons}>
                <Link href="/login" className={styles.loginBtn}>
                  로그인
                </Link>
                <Link href="/signup" className={styles.signupBtn}>
                  회원가입
                </Link>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className={styles.main}>
        <Navbar />

        <div className={styles.writeContainer}>
          {/* 상단 헤더 */}
          <div className={styles.writeHeader}>
            <Link href={`/community/${boardType}`} className={styles.backLink}>
              <ArrowLeft size={20} />
              <span>목록으로</span>
            </Link>
            <div className={styles.boardBadge} style={{ '--board-color': currentBoard.color } as React.CSSProperties}>
              <BoardIcon size={18} />
              <span>{currentBoard.name}</span>
            </div>
          </div>

          {/* 글쓰기 폼 */}
          <form onSubmit={handleSubmit} className={styles.writeForm}>
            {/* 폼 헤더 */}
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>글쓰기</h1>
              <p className={styles.formDescription}>{currentBoard.description}</p>
            </div>

            {/* 제목 입력 */}
            <div className={styles.formRow}>
              <label htmlFor="title" className={styles.rowLabel}>
                제목
              </label>
              <div className={styles.rowInput}>
                <input
                  type="text"
                  id="title"
                  className={styles.titleInput}
                  placeholder="제목을 입력하세요"
                  maxLength={100}
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  autoFocus
                />
                <span className={styles.charCount}>{formData.title.length}/100</span>
              </div>
            </div>

            {/* 내용 입력 */}
            <div className={styles.formRow}>
              <label htmlFor="content" className={styles.rowLabel}>
                내용
              </label>
              <div className={styles.rowInput}>
                <textarea
                  id="content"
                  ref={textareaRef}
                  className={styles.contentTextarea}
                  placeholder="내용을 입력하세요"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
            </div>

            {/* 이미지 업로드 */}
            <div className={styles.formRow}>
              <label className={styles.rowLabel}>
                이미지
              </label>
              <div className={styles.rowInput}>
                <PostImageUpload
                  onImageInsert={handleImageInsert}
                  disabled={isSubmitting}
                />
                <p className={styles.imageHint}>
                  업로드한 이미지는 본문에 자동으로 삽입됩니다
                </p>
              </div>
            </div>

            {/* 옵션 영역 */}
            <div className={styles.optionRow}>
              <span className={styles.optionLabel}>작성자 표시</span>
              <div className={styles.visibilityOptions}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="author-visibility"
                    value="nickname"
                    checked={!formData.is_anonymous}
                    onChange={() => setFormData(prev => ({ ...prev, is_anonymous: false }))}
                  />
                  <span className={styles.radioCustom} />
                  <span className={styles.radioText}>닉네임 공개</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="author-visibility"
                    value="anonymous"
                    checked={formData.is_anonymous}
                    onChange={() => setFormData(prev => ({ ...prev, is_anonymous: true }))}
                  />
                  <span className={styles.radioCustom} />
                  <span className={styles.radioText}>익명</span>
                </label>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* 버튼 영역 */}
            <div className={styles.formActions}>
              <Link href={`/community/${boardType}`} className={styles.cancelBtn}>
                취소
              </Link>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className={styles.spinner} />
                    등록 중...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    등록
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <Footer />
      </div>
    </PageLayout>
  )
}

// Loading fallback for Suspense
function WritePostLoading() {
  return (
    <PageLayout>
      <div className={styles.main}>
        <Navbar />
        <div className={styles.writeContainer}>
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>로딩 중...</p>
          </div>
        </div>
        <Footer />
      </div>
    </PageLayout>
  )
}

// Main export with Suspense boundary
export default function WritePostPage() {
  return (
    <Suspense fallback={<WritePostLoading />}>
      <WritePostContent />
    </Suspense>
  )
}
