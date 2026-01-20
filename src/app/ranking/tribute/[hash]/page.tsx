'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Crown, ArrowLeft } from 'lucide-react'
import Footer from '@/components/Footer'
import {
  TributeGate,
  TributeAccessDenied,
  TributeNav,
  TributePageHero,
  TributeSections,
} from '@/components/tribute'
import { useTributeData, useContentProtection } from '@/lib/hooks'
import { useSupabaseContext } from '@/lib/context'
import { decodeHashToUserId } from '@/lib/utils/hash'
import { USE_MOCK_DATA } from '@/lib/config'
import { mockProfiles } from '@/lib/mock'
import styles from '../../[userId]/page.module.css'

export default function TributeHashPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = use(params)
  const router = useRouter()
  const supabase = useSupabaseContext()
  const [showGate, setShowGate] = useState(true)
  const [decodedUserId, setDecodedUserId] = useState<string | null>(null)
  const [hashError, setHashError] = useState(false)
  const [quickNickname, setQuickNickname] = useState<string | null>(null)

  // 해시 디코딩
  useEffect(() => {
    const userId = decodeHashToUserId(hash)
    if (userId) {
      setDecodedUserId(userId)
    } else {
      setHashError(true)
    }
  }, [hash])

  // 닉네임 빠른 조회 (로딩 화면에 표시용)
  useEffect(() => {
    if (!decodedUserId) return

    const fetchQuickNickname = async () => {
      if (USE_MOCK_DATA) {
        const mockProfile = mockProfiles.find(p => p.id === decodedUserId)
        if (mockProfile) {
          setQuickNickname(mockProfile.nickname)
        }
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', decodedUserId)
        .single()

      if (data?.nickname) {
        setQuickNickname(data.nickname)
      }
    }

    fetchQuickNickname()
  }, [decodedUserId, supabase])

  const {
    hallOfFameData,
    primaryHonor,
    isLoading,
    authLoading,
    accessDenied,
    isContentRestricted,
  } = useTributeData({ userId: decodedUserId || '' })

  // VIP 콘텐츠 보호 (접근이 허용된 경우에만)
  useContentProtection({
    preventContextMenu: !accessDenied && !hashError,
    preventDrag: !accessDenied && !hashError,
    preventSelect: !accessDenied && !hashError,
    preventKeyboardShortcuts: !accessDenied && !hashError,
    preventPrint: !accessDenied && !hashError,
    showConsoleWarning: !accessDenied && !hashError,
  })

  // 2.5초 후 자동으로 게이트 열림
  // hashError와 page_not_found만 별도 화면 표시, 나머지는 게이트 타이머 필요
  useEffect(() => {
    if (hashError || accessDenied === 'page_not_found') return
    const timer = setTimeout(() => {
      setShowGate(false)
    }, 2500)
    return () => clearTimeout(timer)
  }, [hashError, accessDenied])

  // 해시 에러
  if (hashError) {
    return (
      <div className={styles.main}>
        <div className={styles.empty}>
          <Crown size={48} />
          <p>유효하지 않은 페이지입니다</p>
          <Link href="/ranking" className={styles.backBtn}>
            <ArrowLeft size={18} />
            <span>랭킹으로 돌아가기</span>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  // userId 디코딩 대기
  if (!decodedUserId) {
    return (
      <div className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>페이지 확인 중...</span>
        </div>
        <Footer />
      </div>
    )
  }

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          {quickNickname && <span className={styles.loadingName}>{quickNickname}</span>}
          <span>인증 확인 중...</span>
        </div>
        <Footer />
      </div>
    )
  }

  // 접근 거부는 page_not_found 경우에만 표시
  if (accessDenied === 'page_not_found') {
    return (
      <div className={styles.main}>
        <TributeAccessDenied reason={accessDenied} />
        <Footer />
      </div>
    )
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className={styles.main}>
        <div className={styles.loading}>
          <Crown size={32} className={styles.loadingIcon} />
          {quickNickname && <span className={styles.loadingName}>{quickNickname}</span>}
          <div className={styles.spinner} />
          <span>헌정 페이지 준비 중...</span>
        </div>
        <Footer />
      </div>
    )
  }

  // 데이터 없음
  if (!hallOfFameData || hallOfFameData.length === 0 || !primaryHonor) {
    return (
      <div className={styles.main}>
        <div className={styles.empty}>
          <Crown size={48} />
          <p>헌정 페이지 정보를 찾을 수 없습니다</p>
          <Link href="/ranking" className={styles.backBtn}>
            <ArrowLeft size={18} />
            <span>랭킹으로 돌아가기</span>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={styles.main}>
      {/* Entrance Gate Animation */}
      <TributeGate
        isVisible={showGate}
        donorName={primaryHonor.donorName}
        rank={primaryHonor.rank}
        onClose={() => setShowGate(false)}
      />

      {/* Navigation Bar */}
      <TributeNav />

      {/* Hero */}
      <TributePageHero honor={primaryHonor} />

      {/* Content Sections */}
      <TributeSections
        honor={primaryHonor}
        allHonors={hallOfFameData}
        isContentRestricted={isContentRestricted}
      />

      <Footer />
    </div>
  )
}
