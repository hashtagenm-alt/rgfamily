"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Lock,
  Star,
  Heart,
  Play,
  Users,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Film,
  Video,
} from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { useAuthContext, useSupabaseContext } from "@/lib/context";
import { useVipStatus, useRanking, useContentProtection } from "@/lib/hooks";
import { withRetry } from "@/lib/utils/fetch-with-retry";
import styles from "./page.module.css";

// VIP 콘텐츠 타입 정의
interface VipContent {
  memberVideos: {
    id: number;
    memberName: string;
    memberUnit: 'excel' | 'crew';
    thumbnailUrl: string;
    videoUrl: string;
    message: string;
  }[];
  thankYouMessage: string;
  signatures: {
    id: number;
    memberName: string;
    signatureUrl: string;
    unit: 'excel' | 'crew';
  }[];
}

// 기본 VIP 콘텐츠 (데이터가 없을 때)
const defaultVipContent: VipContent = {
  memberVideos: [],
  thankYouMessage: 'RG 패밀리의 VIP가 되어주셔서 진심으로 감사드립니다. 여러분의 사랑과 응원이 저희에게 큰 힘이 됩니다.',
  signatures: [],
};

export default function VipLoungePage() {
  const supabase = useSupabaseContext();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { isVip, rank: userRank, isLoading: vipStatusLoading } = useVipStatus();
  const { rankings, isLoading: rankingLoading } = useRanking();
  const [vipContent, setVipContent] = useState<VipContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGate, setShowGate] = useState(true);

  // VIP 콘텐츠 보호 (우클릭, 드래그, 선택, 키보드 단축키 방지)
  useContentProtection({
    preventContextMenu: true,
    preventDrag: true,
    preventSelect: true,
    preventKeyboardShortcuts: true,
    preventPrint: true,
    showConsoleWarning: true,
  });

  useEffect(() => {
    // 2.5초 후 자동으로 게이트 열림
    const timer = setTimeout(() => {
      setShowGate(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const fetchVipContent = useCallback(async () => {
    setIsLoading(true);

    try {
      // VIP 콘텐츠 조회 - vip_rewards 테이블에서 감사 메시지, 영상 등 조회
      // signatures 테이블에서 VIP 전용 시그니처 조회
      const [rewardsResult, signaturesResult] = await Promise.all([
        withRetry(async () =>
          await supabase
            .from('vip_rewards')
            .select(`
              id,
              personal_message,
              dedication_video_url,
              vip_images (id, image_url, title, order_index)
            `)
            .order('created_at', { ascending: false })
            .limit(10)
        ),
        withRetry(async () =>
          await supabase
            .from('signatures')
            .select('id, title, member_name, thumbnail_url, media_url, unit')
            .eq('is_vip_only', true)
            .order('created_at', { ascending: false })
            .limit(6)
        ),
      ]);

      // 감사 메시지 추출 (첫 번째 보상에서)
      const thankYouMessage = rewardsResult.data?.[0]?.personal_message
        || 'RG 패밀리의 VIP가 되어주셔서 진심으로 감사드립니다. 여러분의 사랑과 응원이 저희에게 큰 힘이 됩니다.';

      // 멤버 영상 변환 (vip_rewards에서 dedication_video_url이 있는 것들)
      const memberVideos = (rewardsResult.data || [])
        .filter((r) => r.dedication_video_url)
        .map((r, idx) => ({
          id: r.id || idx,
          memberName: `멤버 ${idx + 1}`,
          memberUnit: 'excel' as const,
          thumbnailUrl: '',
          videoUrl: r.dedication_video_url || '',
          message: r.personal_message || '',
        }));

      // 시그니처 변환
      const signatures = (signaturesResult.data || []).map((s) => ({
        id: s.id,
        memberName: s.member_name || s.title,
        signatureUrl: s.thumbnail_url || s.media_url,
        unit: (s.unit || 'excel') as 'excel' | 'crew',
      }));

      setVipContent({
        memberVideos: memberVideos.length > 0 ? memberVideos : defaultVipContent.memberVideos,
        thankYouMessage,
        signatures: signatures.length > 0 ? signatures : defaultVipContent.signatures,
      });
    } catch (err) {
      console.error('VIP 콘텐츠 로드 실패:', err);
      // 실패 시 Mock 데이터로 폴백
      setVipContent(defaultVipContent);
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    if (isVip) {
      // Async fetch
      fetchVipContent();
    } else {
      // Avoid immediate state update loops -> use small timeout or better:
      // Since default isLoading is true, if not VIP, we turn it off.
      // But doing it synchronously here triggers the warning.
      // We can rely on the condition to render 'Access Denied' directly?
      // No, isLoading is used to show spinner.
      if (mounted) setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [isVip, fetchVipContent]);

  // 로딩 중
  if (authLoading || vipStatusLoading || isLoading || rankingLoading) {
    return (
      <div className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>VIP 라운지 확인 중...</span>
        </div>
        <Footer />
      </div>
    );
  }

  // 비로그인 상태
  if (!isAuthenticated) {
    return (
      <div className={styles.main}>
        <div className={styles.accessDenied}>
          <div className={styles.lockIcon}>
            <Lock size={48} />
          </div>
          <h1>VIP 라운지</h1>
          <p>VIP 라운지는 로그인 후 이용 가능합니다.</p>
          <Link href="/login" className={styles.loginButton}>
            로그인하기
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // VIP 아닌 경우 (Top 50 이외)
  if (!isVip) {
    return (
      <div className={styles.main}>
        <div className={styles.accessDenied}>
          <div className={styles.lockIcon}>
            <Lock size={48} />
          </div>
          <h1>VIP 전용 공간입니다</h1>
          <p className={styles.deniedMessage}>
            VIP 라운지는 후원 랭킹 <strong>Top 50</strong>만 입장 가능합니다.
          </p>
          {userRank && (
            <p className={styles.currentRank}>
              현재 순위: <strong>{userRank}위</strong>
            </p>
          )}
          <div className={styles.deniedActions}>
            <Link href="/ranking" className={styles.rankingButton}>
              <Trophy size={18} />
              랭킹 확인하기
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <AnimatePresence>
        {showGate && (
          <motion.div
            className={styles.gateOverlay}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            onClick={() => setShowGate(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={styles.gateIcon}
            >
              <Crown size={80} strokeWidth={1} />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.2 }}
              className={styles.gateText}
            >
              VIP LOUNGE
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4 }}
              className={styles.gateSubtext}
            >
              ACCESS GRANTED
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Navigation Bar - Reference Style */}
      <nav className={styles.pageNav}>
        <Link href="/ranking" className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>랭킹</span>
        </Link>
        <div className={styles.navTitle}>
          <Crown size={18} />
          <span>VIP LOUNGE</span>
        </div>
        <div className={styles.navActions}>
          <Link href="/ranking" className={styles.navBtn}>
            <Trophy size={16} />
            <span>랭킹</span>
          </Link>
          <Link href="/" className={styles.navBtn}>
            <span>홈</span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.vipBadge}>
            <Crown size={20} />
            <span>VIP LOUNGE</span>
          </div>
          <h1 className={styles.heroTitle}>환영합니다, VIP!</h1>
          <p className={styles.heroSubtitle}>
            {user?.user_metadata?.nickname || "후원자"}님은 현재{" "}
            {userRank ? <strong>{userRank}위</strong> : "순위 집계 중입니다"}
          </p>
        </motion.div>

        <div className={styles.heroDecoration}>
          <div className={styles.glow} />
          <Star className={styles.star1} size={24} />
          <Star className={styles.star2} size={16} />
          <Star className={styles.star3} size={20} />
        </div>
      </div>

      <div className={styles.container}>
        {/* Thank You Message */}
        {vipContent?.thankYouMessage && (
          <motion.section
            className={styles.messageSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.sectionHeader}>
              <Heart size={20} />
              <h2>FROM RG FAMILY</h2>
            </div>
            <div className={styles.messageCard}>
              <p>{vipContent.thankYouMessage}</p>
            </div>
          </motion.section>
        )}

        {/* Exclusive Content - Featured Video */}
        <motion.section
          className={styles.exclusiveSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className={styles.sectionHeader}>
            <Film size={20} />
            <h2>EXCLUSIVE CONTENT</h2>
          </div>
          <div className={styles.exclusiveContent}>
            <div className={styles.exclusiveInner}>
              <div className={styles.exclusiveVideo}>
                <div className={styles.exclusiveBadge}>
                  <Crown size={12} />
                  VIP ONLY
                </div>
                <button className={styles.exclusivePlayBtn}>
                  <Play size={32} />
                </button>
                <span className={styles.exclusiveLabel}>
                  RG Family Special Message
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Member Videos */}
        {vipContent?.memberVideos && vipContent.memberVideos.length > 0 && (
          <motion.section
            className={styles.videosSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.sectionHeader}>
              <Play size={20} />
              <h2>멤버 감사 영상</h2>
            </div>
            <div className={styles.videosGrid}>
              {vipContent.memberVideos.map((video) => (
                <div key={video.id} className={styles.videoCard}>
                  <div className={styles.videoThumbnail}>
                    <div className={styles.videoPlaceholder}>
                      <Play size={32} />
                    </div>
                    <div
                      className={styles.unitBadge}
                      data-unit={video.memberUnit}
                    >
                      {video.memberUnit === "excel" ? "EXCEL" : "CREW"}
                    </div>
                  </div>
                  <div className={styles.videoInfo}>
                    <h3>{video.memberName}</h3>
                    <p>{video.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* VIP SECRET - Signature Reactions Section */}
        {vipContent?.signatures && vipContent.signatures.length > 0 && (
          <motion.section
            className={styles.signaturesSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className={styles.secretHeader}>
              <div className={styles.secretBadge}>
                <Sparkles size={16} />
                <span>VIP SECRET</span>
              </div>
              <h2>VIP Signature Reactions</h2>
              <p>VIP를 위한 특별 시그니처 리액션</p>
            </div>
            <div className={styles.signaturesGrid}>
              {vipContent.signatures.map((sig, index) => (
                <motion.div
                  key={sig.id}
                  className={styles.signatureCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className={styles.signaturePlaceholder}>
                    <Video size={24} />
                    <span className={styles.signatureName}>
                      {sig.memberName}
                    </span>
                    <Play size={16} className={styles.playIcon} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Top 3 Secret Page Banner */}
        {userRank && userRank <= 3 && (
          <motion.section
            className={styles.secretBanner}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.secretContent}>
              <Crown size={32} className={styles.secretIcon} />
              <div>
                <h3>Top {userRank} 특별 페이지</h3>
                <p>당신만을 위한 특별한 헌정 페이지가 준비되어 있습니다</p>
              </div>
              {user?.id && (
                <Link
                  href={`/ranking/vip/${user.id}`}
                  className={styles.secretLink}
                >
                  입장하기
                  <ArrowRight size={18} />
                </Link>
              )}
            </div>
          </motion.section>
        )}

        {/* VIP Members List */}
        <motion.section
          className={styles.membersSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className={styles.sectionHeader}>
            <Users size={20} />
            <h2>VIP 멤버 (Top 50)</h2>
          </div>
          <div className={styles.membersList}>
            {rankings.slice(0, 50).map((item, index) => (
              <div
                key={item.donorId || index}
                className={`${styles.memberItem} ${
                  item.donorId === user?.id ? styles.currentUser : ""
                }`}
              >
                <span className={styles.memberRank} data-rank={index + 1}>
                  {index < 3 ? <Crown size={14} /> : index + 1}
                </span>
                <span className={styles.memberName}>{item.donorName}</span>
{/* 하트 개수 숨김 */}
              </div>
            ))}
          </div>
        </motion.section>
        </div>
        <Footer />
      </div>
  );
}
