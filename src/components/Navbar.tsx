"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  User,
  LogIn,
  LogOut,
  Crown,
  Radio,
  Users,
  Music2,
  History,
  Trophy,
  Calendar as CalendarIcon,
  Bell,
  MessageSquare,
  Sparkles,
  Shield,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useAuthContext } from "@/lib/context";
import { useHonorQualification } from "@/lib/hooks";
import ThemeToggle from "./ui/ThemeToggle";
import styles from "./Navbar.module.css";

interface SubItem {
  label: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
}

interface NavItem {
  label: string;
  href?: string;
  subItems?: SubItem[];
}

const navItems: NavItem[] = [
  {
    label: "RG 정보",
    subItems: [
      { label: "라이브", href: "/rg/live", description: "현재 방송 중인 멤버", icon: Radio },
      { label: "조직도", href: "/rg/org", description: "엑셀부 / 크루부 조직", icon: Users },
      { label: "시그리스트", href: "/rg/sig", description: "시그니처 모음", icon: Music2 },
      { label: "타임라인", href: "/rg/history", description: "RG 패밀리 연혁", icon: History },
    ],
  },
  {
    label: "후원 랭킹",
    subItems: [
      { label: "전체 랭킹", href: "/ranking", description: "누적 후원 순위", icon: Trophy },
      { label: "시즌별 랭킹", href: "/ranking/season", description: "시즌 선택 및 랭킹", icon: CalendarIcon },
    ],
  },
  {
    label: "공지사항",
    subItems: [
      { label: "전체 공지", href: "/notice", description: "모든 공지사항", icon: Bell },
      { label: "엑셀부 공지", href: "/notice?category=excel", description: "엑셀부 관련 공지", icon: Bell },
      { label: "크루부 공지", href: "/notice?category=crew", description: "크루부 관련 공지", icon: Bell },
    ],
  },
  {
    label: "커뮤니티",
    subItems: [
      { label: "자유게시판", href: "/community/free", description: "자유로운 소통 공간", icon: MessageSquare },
      { label: "VIP 게시판", href: "/community/vip", description: "VIP 전용 라운지", icon: Sparkles },
    ],
  },
  {
    label: "일정",
    href: "/schedule",
    subItems: [
      { label: "달력", href: "/schedule", description: "월별 일정 캘린더", icon: CalendarIcon },
    ],
  },
];

export default function Navbar() {
  const { user, profile, signOut } = useAuthContext();
  const { isQualified: isHonorQualified, isLoading: honorLoading } = useHonorQualification();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    await signOut();
  };

  // Admin 권한 확인 (admin 또는 superadmin)
  const isAdmin = useMemo(() => {
    if (!user || !profile) return false;
    return profile.role === 'admin' || profile.role === 'superadmin';
  }, [user, profile]);

  // Moderator 이상 권한 확인 (Admin 페이지 접근 가능)
  const canAccessAdmin = useMemo(() => {
    if (!user || !profile) return false;
    return ['admin', 'superadmin', 'moderator'].includes(profile.role);
  }, [user, profile]);

  // VIP 자격 확인 (시즌 TOP 3 또는 회차별 고액 후원자 또는 admin)
  const isVipQualified = useMemo(() => {
    if (!user) return false;
    // Admin은 항상 VIP 접근 가능
    if (isAdmin) return true;
    if (honorLoading) return false;
    return isHonorQualified;
  }, [user, isAdmin, honorLoading, isHonorQualified]);

  const handleMouseEnter = (label: string) => {
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    setActiveDropdown(null);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logo}>
          <Link href="/">
            <Image
              src="/assets/logo/rg_logo_3d_pink.png"
              alt="RG Logo"
              width={64}
              height={64}
              priority
              style={{ objectFit: "contain" }}
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className={styles.links}>
          {navItems.map((item) => (
            <div
              key={item.label}
              className={styles.navItem}
              onMouseEnter={() => handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              {item.href && !item.subItems ? (
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <button className={styles.link}>
                  {item.label}
                  {item.subItems && <ChevronDown size={14} className={styles.chevron} />}
                </button>
              )}

              {/* Dropdown Menu */}
              {item.subItems && activeDropdown === item.label && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownContent}>
                    {item.subItems.map((subItem) => {
                      const Icon = subItem.icon;
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={styles.dropdownItem}
                          onClick={() => setActiveDropdown(null)}
                        >
                          <div className={styles.dropdownItemHeader}>
                            {Icon && <Icon size={16} className={styles.dropdownIcon} />}
                            <span className={styles.dropdownLabel}>{subItem.label}</span>
                          </div>
                          {subItem.description && (
                            <span className={styles.dropdownDesc}>{subItem.description}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Admin Button - Admin/Moderator에게만 표시 */}
          {canAccessAdmin && (
            <Link href="/admin" className={styles.adminBtn}>
              <Shield size={14} />
              <span>Admin</span>
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <div
              className={styles.profileWrapper}
              onMouseEnter={() => setIsProfileMenuOpen(true)}
              onMouseLeave={() => setIsProfileMenuOpen(false)}
            >
              <button className={styles.profileButton}>
                <div className={styles.avatar}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.nickname} />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <span className={styles.nickname}>{profile?.nickname || "회원"}</span>
                <ChevronDown size={14} className={`${styles.chevron} ${isProfileMenuOpen ? styles.chevronOpen : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div className={styles.profileDropdown}>
                  <div className={styles.profileDropdownContent}>
                    <Link
                      href="/mypage"
                      className={styles.profileDropdownItem}
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <Settings size={16} />
                      <span>마이페이지</span>
                    </Link>
                    <button
                      className={styles.profileDropdownItem}
                      onClick={handleSignOut}
                    >
                      <LogOut size={16} />
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className={styles.loginBtn}>
              <LogIn size={16} />
              <span>로그인</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className={styles.mobileMenuBtn}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className={`${styles.hamburger} ${isMobileMenuOpen ? styles.active : ""}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          {/* Mobile Actions */}
          <div className={styles.mobileActions}>
            {/* Admin Button - 모바일 */}
            {canAccessAdmin && (
              <Link
                href="/admin"
                className={styles.adminBtn}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Shield size={14} />
                <span>Admin</span>
              </Link>
            )}
            {user ? (
              <>
                <Link
                  href="/mypage"
                  className={styles.mobileProfileBtn}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User size={16} />
                  <span>{profile?.nickname || "마이페이지"}</span>
                </Link>
                <button
                  className={styles.mobileLogoutBtn}
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />
                  <span>로그아웃</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={styles.mobileLoginBtn}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LogIn size={16} />
                <span>로그인</span>
              </Link>
            )}
          </div>

          {/* Navigation Items */}
          {navItems.map((item) => (
            <div key={item.label} className={styles.mobileNavItem}>
              <div className={styles.mobileNavHeader}>{item.label}</div>
              {item.subItems && (
                <div className={styles.mobileSubItems}>
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={styles.mobileSubItem}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
