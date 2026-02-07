"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trophy, Crown, Flame, TrendingUp, Users, Sparkles } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

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
          viewerScore: (p.total_donation || 0) * 50,
          donationCount: 0,
          topBj: null,
          rank: idx + 1,
        }))
      );
      setIsLoading(false);
      return;
    }

    // 총 후원 랭킹: total_rankings_public View에서 조회 (보안: total_amount 미노출)
    // View에 profile_id, avatar_url, is_vip_clickable 포함
    const [seasonResult, totalRankingsResult] = await Promise.all([
      supabase.from("seasons").select("id, name, is_active").eq("is_active", true).single(),
      supabase.from("total_rankings_public")
        .select("rank, donor_name, viewer_score, donation_count, top_bj, profile_id, avatar_url, is_vip_clickable")
        .order("rank", { ascending: true })
        .limit(60),  // 불완전 데이터 필터 후 50명 채우기 위해 여유 확보
    ]);

    // 현재 시즌 랭킹도 가져오기 (듀얼 랭킹 표시용)
    let seasonRankingsMap: Record<string, number> = {};
    if (seasonResult.data?.id) {
      const { data: seasonRankingsData } = await supabase
        .from("season_rankings_public")
        .select("rank, donor_name")
        .eq("season_id", seasonResult.data.id)
        .order("rank", { ascending: true })
        .limit(50);

      (seasonRankingsData || []).forEach(item => {
        seasonRankingsMap[item.donor_name.trim()] = item.rank;
      });
    }

    // 시즌 데이터 설정
    if (seasonResult.data) {
      setCurrentSeason(seasonResult.data);
    }

    // 랭킹 데이터 처리
    if (totalRankingsResult.error) {
      console.error("총 후원 랭킹 로드 실패:", totalRankingsResult.error);
      setError("랭킹 데이터를 불러오는데 실패했습니다.");
      setRankings([]);
      setIsLoading(false);
      return;
    }

    // View에서 제공하는 데이터 직접 사용 (profile_id, avatar_url, is_vip_clickable 포함)
    // 중복 닉네임만 제거 (donation_count/top_bj 없어도 포함하여 50명 채움)
    const seenDonors = new Set<string>();
    const filteredData = (totalRankingsResult.data || []).filter((item) => {
      const name = item.donor_name.trim();
      if (seenDonors.has(name)) return false;
      seenDonors.add(name);
      return true;
    });

    // 순위 재정렬 (1부터, 최대 50명)
    const sorted = filteredData.slice(0, 50).map((item, idx) => {
      const trimmedName = item.donor_name.trim();
      return {
        donorId: item.profile_id || null,
        donorName: item.donor_name,
        avatarUrl: item.avatar_url || null,
        viewerScore: item.viewer_score || 0,
        donationCount: item.donation_count || 0,
        topBj: item.top_bj || null,
        rank: idx + 1,
        totalRank: idx + 1,
        seasonRank: seasonRankingsMap[trimmedName] || undefined,
        hasVipRewards: item.is_vip_clickable || false,
      };
    });

    // VIP 페이지 클릭 가능한 사용자 (View의 is_vip_clickable 기반)
    const clickableIds = sorted
      .filter(item => item.donorId && item.hasVipRewards)
      .map(item => item.donorId as string);
    setPodiumProfileIds([...new Set(clickableIds)]);

    setRankings(sorted);

    setIsLoading(false);
  }, [supabase, unitFilter]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

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
          ) : error ? (
            <div className={styles.error}>
              <Trophy size={48} />
              <p>{error}</p>
              <button onClick={fetchRankings} className={styles.retryBtn}>
                다시 시도
              </button>
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
