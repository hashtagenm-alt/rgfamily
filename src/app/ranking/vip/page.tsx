"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Star,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { useSupabaseContext } from "@/lib/context";
import { USE_MOCK_DATA } from "@/lib/config";
import { rankedProfiles } from "@/lib/mock";
import styles from "./page.module.css";

interface VipMember {
  id: string;
  profileId: string | null;
  nickname: string;
  rank: number;
  hasProfilePage: boolean;
}

export default function VipLoungePage() {
  const supabase = useSupabaseContext();
  const [vipMembers, setVipMembers] = useState<VipMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVipMembers = useCallback(async () => {
    setIsLoading(true);

    try {
      if (USE_MOCK_DATA) {
        // Mock 모드: rankedProfiles에서 VIP 프로필이 있는 유저만 (상위 50명)
        const members = rankedProfiles.slice(0, 50).map((profile, index) => ({
          id: profile.id,
          profileId: profile.id,
          nickname: profile.nickname || "익명",
          rank: index + 1,
          hasProfilePage: true,
        }));
        setVipMembers(members);
        setIsLoading(false);
        return;
      }

      // Supabase 모드: vip_rewards 테이블에서 프로필 페이지가 있는 유저들만 조회
      const { data: rewardsData, error } = await supabase
        .from("vip_rewards")
        .select("profile_id, rank, profiles:profile_id(nickname)")
        .order("rank", { ascending: true });

      if (error) {
        console.error("VIP rewards 조회 실패:", error);
        setVipMembers([]);
        setIsLoading(false);
        return;
      }

      // vip_rewards에 등록된 유저들만 표시 (프로필 페이지 보유자)
      // 중복 제거: profile_id 기준으로 가장 좋은 랭크만 유지
      const profileMap = new Map<string, { nickname: string; rank: number }>();

      (rewardsData || []).forEach((r) => {
        const profile = r.profiles;
        const nickname = Array.isArray(profile)
          ? profile[0]?.nickname
          : (profile as { nickname: string } | null)?.nickname;

        const existing = profileMap.get(r.profile_id);
        if (!existing || r.rank < existing.rank) {
          profileMap.set(r.profile_id, {
            nickname: nickname || "익명",
            rank: r.rank,
          });
        }
      });

      const members = Array.from(profileMap.entries())
        .map(([profileId, data]) => ({
          id: profileId,
          profileId: profileId,
          nickname: data.nickname,
          rank: data.rank,
          hasProfilePage: true,
        }))
        .sort((a, b) => a.rank - b.rank);

      setVipMembers(members);
    } catch (error) {
      console.error("VIP 멤버 로드 실패:", error);
      setVipMembers([]);
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchVipMembers();
  }, [fetchVipMembers]);

  return (
    <div className={styles.main}>
      {/* Navigation */}
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
          <h1 className={styles.heroTitle}>명예의 전당</h1>
          <p className={styles.heroSubtitle}>
            RG Family를 빛내주신 후원자님들
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
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>VIP 멤버를 불러오는 중...</span>
          </div>
        ) : vipMembers.length === 0 ? (
          <div className={styles.empty}>
            <Crown size={48} />
            <p>등록된 VIP 멤버가 없습니다</p>
          </div>
        ) : (
          <motion.section
            className={styles.vipSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.sectionHeader}>
              <Sparkles size={20} />
              <h2>VIP MEMBERS</h2>
            </div>
            <div className={styles.vipGrid}>
              {vipMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  className={styles.vipCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link
                    href={`/ranking/vip/${member.profileId}`}
                    className={styles.vipCardLink}
                  >
                    <div className={styles.vipCardRank} data-rank={member.rank}>
                      {member.rank}
                    </div>
                    <div className={styles.vipCardIcon}>
                      <Crown size={28} />
                    </div>
                    <h3 className={styles.vipCardName}>{member.nickname}</h3>
                    <span className={styles.vipCardLabel}>VIP</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      <Footer />
    </div>
  );
}
