'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

/**
 * Legacy Tribute Page - VIP 개인 페이지로 리다이렉트
 *
 * /ranking/[userId] 접근 시 /ranking/vip/[userId]로 자동 리다이렉트
 */
export default function TributePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()

  useEffect(() => {
    // 랭킹 페이지로 리다이렉트
    router.replace('/ranking')
  }, [router])

  return (
    <div className={styles.main}>
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>페이지 이동 중...</span>
      </div>
    </div>
  )
}
