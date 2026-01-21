'use client'

import { useState, Suspense, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, AlertCircle, Bell, ShieldAlert } from 'lucide-react'
import { PageLayout } from '@/components/layout'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useAuthContext } from '@/lib/context/AuthContext'
import { useSupabaseContext } from '@/lib/context'
import { createNotice, updateNotice } from '@/lib/actions/notices'
import styles from './page.module.css'

type NoticeCategory = 'official' | 'excel' | 'crew'

interface FormData {
  title: string
  content: string
  category: NoticeCategory
  is_pinned: boolean
}

const CATEGORY_OPTIONS: { value: NoticeCategory; label: string }[] = [
  { value: 'official', label: '공식' },
  { value: 'excel', label: '엑셀부' },
  { value: 'crew', label: '크루부' },
]

function WriteNoticeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useSupabaseContext()
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuthContext()

  // 수정 모드인지 확인
  const editId = searchParams.get('id')
  const isEditMode = !!editId

  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    category: 'official',
    is_pinned: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingNotice, setIsLoadingNotice] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 수정 모드일 경우 기존 데이터 로드
  const fetchNotice = useCallback(async () => {
    if (!editId) return

    setIsLoadingNotice(true)
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('id', parseInt(editId))
      .single()

    if (error) {
      setError('공지사항을 찾을 수 없습니다.')
    } else if (data) {
      setFormData({
        title: data.title,
        content: data.content || '',
        category: (data.category as NoticeCategory) || 'official',
        is_pinned: data.is_pinned,
      })
    }
    setIsLoadingNotice(false)
  }, [editId, supabase])

  useEffect(() => {
    if (isEditMode) {
      fetchNotice()
    }
  }, [isEditMode, fetchNotice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    if (formData.title.length > 200) {
      setError('제목은 200자 이내로 입력해주세요.')
      return
    }

    if (!formData.content.trim()) {
      setError('내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditMode && editId) {
        // 수정 모드
        const result = await updateNotice(parseInt(editId), {
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
          is_pinned: formData.is_pinned,
        })

        if (result.error) {
          setError(result.error)
          return
        }

        router.push(`/notice/${editId}`)
      } else {
        // 작성 모드
        const result = await createNotice({
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
          is_pinned: formData.is_pinned,
        })

        if (result.error) {
          setError(result.error)
          return
        }

        router.push('/notice')
      }
    } catch {
      setError('공지사항 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 로딩 중
  if (authLoading) {
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
              <p>공지사항을 작성하려면 먼저 로그인해주세요.</p>
              <div className={styles.authButtons}>
                <Link href="/login" className={styles.loginBtn}>
                  로그인
                </Link>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </PageLayout>
    )
  }

  // 관리자가 아닌 경우
  if (!isAdmin()) {
    return (
      <PageLayout>
        <div className={styles.main}>
          <Navbar />
          <div className={styles.writeContainer}>
            <div className={styles.authRequired}>
              <ShieldAlert size={48} />
              <h2>접근 권한이 없습니다</h2>
              <p>공지사항 작성은 관리자만 가능합니다.</p>
              <div className={styles.authButtons}>
                <Link href="/notice" className={styles.loginBtn}>
                  공지사항 목록으로
                </Link>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </PageLayout>
    )
  }

  // 수정 모드에서 데이터 로딩 중
  if (isLoadingNotice) {
    return (
      <PageLayout>
        <div className={styles.main}>
          <Navbar />
          <div className={styles.writeContainer}>
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>공지사항을 불러오는 중...</p>
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
            <Link href="/notice" className={styles.backLink}>
              <ArrowLeft size={20} />
              <span>목록으로</span>
            </Link>
            <div className={styles.boardBadge}>
              <Bell size={18} />
              <span>공지사항 {isEditMode ? '수정' : '작성'}</span>
            </div>
          </div>

          {/* 글쓰기 폼 */}
          <form onSubmit={handleSubmit} className={styles.writeForm}>
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
                  placeholder="공지사항 제목을 입력하세요"
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  autoFocus
                />
                <span className={styles.charCount}>{formData.title.length}/200</span>
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
                  className={styles.contentTextarea}
                  placeholder="공지사항 내용을 입력하세요"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
            </div>

            {/* 옵션 영역 */}
            <div className={styles.optionRow}>
              <div className={styles.optionGroup}>
                <span className={styles.optionLabel}>분류</span>
                <div className={styles.categoryOptions}>
                  {CATEGORY_OPTIONS.map(option => (
                    <label key={option.value} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="category"
                        value={option.value}
                        checked={formData.category === option.value}
                        onChange={() => setFormData(prev => ({ ...prev, category: option.value }))}
                      />
                      <span className={styles.radioCustom} />
                      <span className={styles.radioText}>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.optionGroup}>
                <span className={styles.optionLabel}>고정</span>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
                  />
                  <span className={styles.checkboxCustom} />
                  <span className={styles.checkboxText}>상단 고정</span>
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
              <Link href="/notice" className={styles.cancelBtn}>
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
                    {isEditMode ? '수정 중...' : '등록 중...'}
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    {isEditMode ? '수정' : '등록'}
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
function WriteNoticeLoading() {
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
export default function WriteNoticePage() {
  return (
    <Suspense fallback={<WriteNoticeLoading />}>
      <WriteNoticeContent />
    </Suspense>
  )
}
