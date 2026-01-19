'use client'

import { Heart, Crown, Tv, Calendar, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import styles from './SideBanner.module.css'

interface QuickLinkItem {
  icon: typeof Heart
  label: string
  href: string
  external?: boolean
  highlight?: boolean
}

const QUICK_LINKS: QuickLinkItem[] = [
  {
    icon: Tv,
    label: '팬더TV',
    href: 'https://www.pandalive.co.kr',
    external: true,
  },
  {
    icon: Crown,
    label: 'VIP 랭킹',
    href: '/ranking/vip',
    highlight: true,
  },
  {
    icon: Calendar,
    label: '일정',
    href: '/schedule',
  },
  {
    icon: Heart,
    label: '시그니처',
    href: '/rg/sig',
  },
]

/**
 * SideBanner - 사이드바 퀵링크 & 브랜딩 컴포넌트
 */
export default function SideBanner() {
  return (
    <div className={styles.container}>
      {/* 브랜드 로고 */}
      <div className={styles.brandSection}>
        <div className={styles.brandLogo}>
          <span className={styles.brandRG}>RG</span>
          <span className={styles.brandFamily}>FAMILY</span>
        </div>
        <p className={styles.brandTagline}>Official Fan Community</p>
      </div>

      {/* 퀵 링크 */}
      <nav className={styles.quickLinks}>
        <span className={styles.linksLabel}>Quick Links</span>
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          const content = (
            <div className={`${styles.linkItem} ${link.highlight ? styles.highlight : ''}`}>
              <Icon size={16} />
              <span>{link.label}</span>
              {link.external && <ExternalLink size={12} className={styles.externalIcon} />}
            </div>
          )

          if (link.external) {
            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                {content}
              </a>
            )
          }

          return (
            <Link key={link.label} href={link.href} className={styles.link}>
              {content}
            </Link>
          )
        })}
      </nav>

      {/* 시즌 정보 */}
      <div className={styles.seasonBadge}>
        <span className={styles.seasonLabel}>SEASON</span>
        <span className={styles.seasonNumber}>1</span>
      </div>
    </div>
  )
}
