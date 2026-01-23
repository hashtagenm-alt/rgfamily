"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trophy, Crown, Flame, TrendingUp, Users, Sparkles, Award } from "lucide-react";
import { PageLayout } from "@/components/layout";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSupabaseContext } from "@/lib/context";
import { USE_MOCK_DATA } from "@/lib/config";
import { rankedProfiles, mockVipRewardsDB } from "@/lib/mock";
import type { RankingItem, UnitFilter } from "@/types/common";
import {
  RankingPodium,
  RankingFullList,
} from "@/components/ranking";
import styles from "./page.module.css";

interface Season {
  id: number;
  name: string;
  is_active: boolean;
}

export default function TotalRankingPage() {
  const supabase = useSupabaseContext();
  const listRef = useRef<HTMLDivElement>(null);
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [podiumProfileIds, setPodiumProfileIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setIsLoading(true);

    // Mock 데이터 모드
    if (USE_MOCK_DATA) {
      // Mock 시즌 데이터
      setCurrentSeason({ id: 1, name: '시즌 1', is_active: true });

      // 포디움 달성자 profile_id 추출 (rank 1-3)
      const podiumIds = mockVipRewardsDB
        .filter(r => r.rank <= 3)
        .map(r => r.profile_id);
      setPodiumProfileIds([...new Set(podiumIds)]);

      // Mock 랭킹 데이터 (unit 필터 적용)
      let filteredProfiles = rankedProfiles;
      if (unitFilter !== 'all' && unitFilter !== 'vip') {
        filteredProfiles = rankedProfiles.filter(p => p.unit === unitFilter);
      }

      setRankings(
        filteredProfiles.slice(0, 50).map((p, idx) => ({
          donorId: p.id,
          donorName: p.nickname || "익명",
          avatarUrl: p.avatar_url,
          totalAmount: p.total_donation || 0,
          rank: idx + 1,
        }))
      );
      setIsLoading(false);
      return;
    }

    // 총 후원 랭킹: total_rankings_public View에서 조회 (보안: total_amount 미노출)
    const [seasonResult, totalRankingsResult, vipResult] = await Promise.all([
      supabase.from("seasons").select("id, name, is_active").eq("is_active", true).single(),
      supabase.from("total_rankings_public")
        .select("rank, donor_name, gauge_percent")
        .order("rank", { ascending: true })
        .limit(50),
      supabase.from("vip_rewards").select("profile_id, rank, profiles:profile_id(nickname)")
    ]);

    // 시즌 데이터 설정
    if (seasonResult.data) {
      setCurrentSeason(seasonResult.data);
    }

    // 랭킹 데이터 처리
    if (totalRankingsResult.error) {
      console.error("총 후원 랭킹 로드 실패:", totalRankingsResult.error);
      setRankings([]);
    } else {
      // 닉네임 → profile_id 매핑 생성 + 포디움 달성자 추출
      const nicknameToProfileId: Record<string, string> = {};
      const podiumIds: string[] = [];
      (vipResult.data || []).forEach((v) => {
        const profileData = v.profiles;
        const nickname = Array.isArray(profileData)
          ? profileData[0]?.nickname
          : (profileData as { nickname: string } | null)?.nickname;
        if (nickname && v.profile_id) {
          nicknameToProfileId[nickname] = v.profile_id;
          // 포디움 달성자 (rank 1-3)
          if (v.rank && v.rank <= 3) {
            podiumIds.push(v.profile_id);
          }
        }
      });

      // 모든 랭킹 사용자의 프로필 정보 (id, avatar_url) 조회
      // trim 처리하여 공백 차이 해결
      const allDonorNames = (totalRankingsResult.data || []).map(item => item.donor_name.trim());

      // 프로필 조회 - 정확 매칭 + 전체 조회 fallback
      let allProfilesData = null;
      const { data: exactMatchProfiles } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url")
        .in("nickname", allDonorNames);

      if (exactMatchProfiles && exactMatchProfiles.length > 0) {
        allProfilesData = exactMatchProfiles;
      } else {
        // 정확 매칭 실패 시 전체 프로필 조회 후 유사 매칭
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, nickname, avatar_url")
          .not("avatar_url", "is", null);
        allProfilesData = allProfiles;
      }

      // 닉네임 → profile 정보 매핑 생성 (trim + 정규화)
      const nicknameToProfile: Record<string, { id: string; avatar_url: string | null }> = {};
      const normalizedNicknameMap: Record<string, string> = {}; // 정규화된 닉네임 → 원본 닉네임

      (allProfilesData || []).forEach((profile) => {
        if (profile.nickname) {
          const normalizedNickname = profile.nickname.trim().toLowerCase();
          nicknameToProfile[profile.nickname] = {
            id: profile.id,
            avatar_url: profile.avatar_url,
          };
          // 정규화된 버전도 저장
          nicknameToProfile[profile.nickname.trim()] = {
            id: profile.id,
            avatar_url: profile.avatar_url,
          };
          normalizedNicknameMap[normalizedNickname] = profile.nickname;
        }
      });

      // donor_name으로 프로필 찾기 헬퍼 함수
      const findProfile = (donorName: string) => {
        // 1. 정확 매칭
        if (nicknameToProfile[donorName]) return nicknameToProfile[donorName];
        // 2. trim 매칭
        const trimmed = donorName.trim();
        if (nicknameToProfile[trimmed]) return nicknameToProfile[trimmed];
        // 3. 정규화 매칭 (lowercase)
        const normalized = trimmed.toLowerCase();
        const originalNickname = normalizedNicknameMap[normalized];
        if (originalNickname && nicknameToProfile[originalNickname]) {
          return nicknameToProfile[originalNickname];
        }
        return null;
      };

      // 기존 nicknameToProfileId에도 반영
      Object.entries(nicknameToProfile).forEach(([nickname, data]) => {
        if (!nicknameToProfileId[nickname]) {
          nicknameToProfileId[nickname] = data.id;
        }
      });

      const sorted = (totalRankingsResult.data || []).map((item) => {
        const profile = findProfile(item.donor_name);
        return {
          donorId: nicknameToProfileId[item.donor_name] || profile?.id || null,
          donorName: item.donor_name,
          avatarUrl: profile?.avatar_url || null,
          totalAmount: item.gauge_percent || 0, // 게이지 퍼센트 (1위=100 기준)
          rank: item.rank,
        };
      });

      // 1~3위 후원자의 donorId도 podiumProfileIds에 추가
      const top3Ids = sorted
        .filter(item => item.rank <= 3 && item.donorId)
        .map(item => item.donorId as string);
      setPodiumProfileIds([...new Set([...podiumIds, ...top3Ids])]);

      setRankings(sorted);
    }

    setIsLoading(false);
  }, [supabase, unitFilter]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const maxAmount = rankings.length > 0 ? rankings[0].totalAmount : 0;
  const top3 = rankings.slice(0, 3);

  return (
    <PageLayout showSideBanners={false}>
      <main className={styles.main}>
        <Navbar />

        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroContent}>
            <div className={styles.heroTitleRow}>
              <Crown className={styles.heroCrown} size={36} />
              <h1 className={styles.heroTitle}>후원 랭킹</h1>
            </div>
            <p className={styles.heroSubtitle}>RG FAMILY를 빛내주신 후원자님들께 감사드립니다</p>

            {/* Quick Links */}
            <div className={styles.heroLinks}>
              {currentSeason && (
                <Link href={`/ranking/season/${currentSeason.id}`} className={styles.heroLinkSeason}>
                  <Flame size={16} />
                  <span>{currentSeason.name} 진행중</span>
                </Link>
              )}
              <Link href="/ranking/hall-of-fame" className={styles.heroLinkHallOfFame}>
                <Award size={16} />
                <span>명예의 전당</span>
              </Link>
            </div>
          </div>
        </section>

        <div className={styles.container}>
          {/* Unit Filter */}
          <div className={styles.filterSection}>
            <div className={styles.unitFilter}>
              <div className={styles.unitFilterLabel}>
                <Users size={14} />
                <span>소속별 보기</span>
              </div>
              <div className={styles.unitTabs}>
                <div
                  className={styles.unitTabIndicator}
                  data-active={unitFilter}
                />
                {(["all", "excel", "crew"] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setUnitFilter(unit)}
                    className={`${styles.unitTab} ${unitFilter === unit ? styles.active : ""}`}
                    data-unit={unit}
                  >
                    {unit === "all" && <Sparkles size={14} />}
                    <span>{unit === "all" ? "전체" : unit === "excel" ? "엑셀" : "크루"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>랭킹을 불러오는 중...</span>
            </div>
          ) : rankings.length === 0 ? (
            <div className={styles.empty}>
              <Trophy size={48} />
              <p>아직 등록된 후원 데이터가 없습니다</p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium - 프리미엄 소개 영역 */}
              <section className={styles.podiumSection}>
                <RankingPodium items={top3} podiumProfileIds={podiumProfileIds} onRefetch={fetchRankings} />
              </section>

              {/* Full Ranking List */}
              <section ref={listRef} className={styles.listSection}>
                <div className={styles.listHeader}>
                  <h2 className={styles.listTitle}>
                    <TrendingUp size={16} />
                    전체 랭킹
                  </h2>
                  <span className={styles.listBadge}>TOP {Math.min(50, rankings.length)}</span>
                </div>
                <RankingFullList
                  rankings={rankings}
                  maxAmount={maxAmount}
                  limit={50}
                  podiumProfileIds={podiumProfileIds}
                />
              </section>
            </>
          )}
        </div>
        <Footer />
      </main>
    </PageLayout>
  );
}
