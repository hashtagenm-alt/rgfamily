'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Crown } from 'lucide-react'
import Footer from '@/components/Footer'
import { decodeHashToUserId } from '@/lib/utils/hash'
import styles from '../../[userId]/page.module.css'

/**
 * Legacy Tribute Page - VIP 개인 페이지로 리다이렉트
 *
 * /ranking/tribute/[hash] 접근 시 /ranking/vip/[userId]로 자동 리다이렉트
 * 구버전 URL 호환성 유지를 위해 존재
 */
export default function TributeHashPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = use(params)
  const router = useRouter()

  useEffect(() => {
    // 해시 디코딩
    const userId = decodeHashToUserId(hash)
    // 랭킹 페이지로 리다이렉트
    router.replace('/ranking')
  }, [hash, router])

  return (
    <div className={styles.main}>
      <div className={styles.loading}>
        <Crown size={32} className={styles.loadingIcon} />
        <div className={styles.spinner} />
        <span>페이지 이동 중...</span>
      </div>
      <Footer />
    </div>
  )
}
