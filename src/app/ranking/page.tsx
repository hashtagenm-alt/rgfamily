"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trophy, Crown, Flame, TrendingUp, Users, Sparkles } from "lucide-react";
import { PageLayout } from "@/components/layout";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSupabaseContext } from "@/lib/context";
import { USE_MOCK_DATA } from "@/lib/config";
import { rankedProfiles } from "@/lib/mock";
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setIsLoading(true);

    // Mock 데이터 모드
    if (USE_MOCK_DATA) {
      // Mock 시즌 데이터
      setCurrentSeason({ id: 1, name: '시즌 1', is_active: true });

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

    // 현재 활성 시즌 조회
    const { data: seasonData } = await supabase
      .from("seasons")
      .select("id, name, is_active")
      .eq("is_active", true)
      .single();

    if (seasonData) {
      setCurrentSeason(seasonData);
    }

    // 전체 랭킹: donations 테이블에서 집계
    let query = supabase
      .from("donations")
      .select("donor_id, donor_name, amount, unit");

    if (unitFilter !== 'all' && unitFilter !== 'vip') {
      query = query.eq("unit", unitFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("랭킹 로드 실패:", error);
      setRankings([]);
    } else {
      // donor_name 기준으로 합계 계산
      const donorTotals: Record<string, {
        donorId: string | null;
        name: string;
        amount: number;
        unit: string | null;
      }> = {};

      (data || []).forEach((d) => {
        const key = d.donor_name;
        if (!donorTotals[key]) {
          donorTotals[key] = {
            donorId: d.donor_id,
            name: d.donor_name,
            amount: 0,
            unit: d.unit
          };
        }
        donorTotals[key].amount += d.amount;
      });

      // 정렬된 후원자 목록
      const sortedDonors = Object.values(donorTotals)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 50);

      // vip_rewards 테이블에서 profile_id 조회 (닉네임으로 매칭)
      const { data: vipData } = await supabase
        .from("vip_rewards")
        .select("profile_id, profiles:profile_id(nickname)");

      // 닉네임 → profile_id 매핑 생성
      const nicknameToProfileId: Record<string, string> = {};
      (vipData || []).forEach((v) => {
        const profileData = v.profiles;
        const nickname = Array.isArray(profileData)
          ? profileData[0]?.nickname
          : (profileData as { nickname: string } | null)?.nickname;
        if (nickname && v.profile_id) {
          nicknameToProfileId[nickname] = v.profile_id;
        }
      });

      const sorted = sortedDonors.map((item, idx) => ({
        donorId: item.donorId || nicknameToProfileId[item.name] || null,
        donorName: item.name,
        avatarUrl: null,
        totalAmount: item.amount,
        rank: idx + 1,
      }));

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
    <PageLayout>
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
          ) : rankings.length === 0 ? (
            <div className={styles.empty}>
              <Trophy size={48} />
              <p>아직 등록된 후원 데이터가 없습니다</p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              <section className={styles.podiumSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <Crown size={18} />
                    TOP 3
                  </h2>
                </div>
                <RankingPodium items={top3} />
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
