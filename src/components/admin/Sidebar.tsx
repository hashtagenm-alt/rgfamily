'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Heart,
  Calendar,
  Building,
  CalendarDays,
  Megaphone,
  MessageSquare,
  Film,
  Image,
  Crown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  BarChart3,
  Clock,
  Medal,
  UserCheck,
  Swords,
} from 'lucide-react'
import { useAuthContext } from '@/lib/context'
import styles from './Sidebar.module.css'

const menuItems = [
  { href: '/admin', icon: LayoutDashboard, label: '대시보드' },
  { href: '/admin/analytics', icon: BarChart3, label: '분석' },
  { href: '/admin/members', icon: Users, label: '회원 관리' },
  { href: '/admin/dashboard', icon: UserCheck, label: '출연BJ 관리' },
  { href: '/admin/teams', icon: Swords, label: '팀/매칭 관리' },
  { href: '/admin/donations', icon: Heart, label: '후원 관리' },
  { href: '/admin/donation-rankings', icon: Medal, label: '후원 랭킹 관리' },
  { href: '/admin/seasons', icon: Calendar, label: '시즌/에피소드' },
  { href: '/admin/organization', icon: Building, label: '조직도 관리' },
  { href: '/admin/schedules', icon: CalendarDays, label: '일정 관리' },
  { href: '/admin/timeline', icon: Clock, label: '타임라인 관리' },
  { href: '/admin/notices', icon: Megaphone, label: '공지사항 관리' },
  { href: '/admin/posts', icon: MessageSquare, label: '게시글 관리' },
  { href: '/admin/media', icon: Film, label: '미디어 관리' },
  { href: '/admin/signatures', icon: Image, label: '시그니처 관리' },
  { href: '/admin/vip-rewards', icon: Crown, label: 'VIP 관리' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuthContext()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    // 출연BJ 관리: dashboard, ranks 포함
    if (href === '/admin/dashboard') {
      return pathname.startsWith('/admin/dashboard') ||
             pathname.startsWith('/admin/ranks')
    }
    // 시즌/에피소드: seasons, episodes 포함
    if (href === '/admin/seasons') {
      return pathname.startsWith('/admin/seasons') ||
             pathname.startsWith('/admin/episodes')
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <motion.aside
      className={styles.sidebar}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.2 }}
    >
      {/* Logo */}
      <div className={styles.logo}>
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.logoText}
            >
              RG Admin
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={styles.toggleButton}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
          >
            <item.icon size={20} className={styles.icon} />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={styles.label}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {isActive(item.href) && (
              <motion.div
                layoutId="activeIndicator"
                className={styles.activeIndicator}
              />
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <Link href="/" className={styles.footerItem}>
          <Home size={20} />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                홈으로
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button onClick={handleLogout} className={styles.footerItem}>
          <LogOut size={20} />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                로그아웃
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
