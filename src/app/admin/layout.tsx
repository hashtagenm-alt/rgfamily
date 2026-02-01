'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/admin'
import { useAuthContext } from '@/lib/context'
import { AlertProvider } from '@/lib/hooks/useAlert'
import styles from './layout.module.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, isLoading } = useAuthContext()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push('/login?redirect=/admin')
      return
    }

    // 관리자 권한 체크 (BJ도 미디어 업로드 등 일부 기능 접근 가능)
    const allowedRoles = ['superadmin', 'admin', 'moderator', 'bj']
    if (!profile || !allowedRoles.includes(profile.role)) {
      router.push('/')
      return
    }

    setIsAuthorized(true)
  }, [user, profile, isLoading, router])

  if (isLoading || !isAuthorized) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner} />
        <span>권한을 확인하는 중...</span>
      </div>
    )
  }

  return (
    <AlertProvider>
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.main}>
          <div className={styles.content}>
            {children}
          </div>
        </main>
      </div>
    </AlertProvider>
  )
}
