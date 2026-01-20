"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Trophy, Users, Calendar, Crown, Flame, TrendingUp } from "lucide-react";
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
      setCurrentSeason({ id: 4, name: '시즌 4', is_active: true });

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

    // 전체 랭킹: profiles 테이블에서 total_donation 기준
    let query = supabase
      .from("profiles")
      .select("id, nickname, avatar_url, total_donation, unit")
      .gt("total_donation", 0)
      .order("total_donation", { ascending: false })
      .limit(50);

    if (unitFilter !== 'all' && unitFilter !== 'vip') {
      query = query.eq("unit", unitFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("랭킹 로드 실패:", error);
      setRankings([]);
    } else {
      setRankings(
        (data || []).map((p, idx) => ({
          donorId: p.id,
          donorName: p.nickname || "익명",
          avatarUrl: p.avatar_url,
          totalAmount: p.total_donation || 0,
          rank: idx + 1,
        }))
      );
    }

    setIsLoading(false);
  }, [supabase, unitFilter]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  // 통계 계산
  const stats = useMemo(() => {
    if (rankings.length === 0) return null;
    const participantCount = rankings.length;
    return { participantCount };
  }, [rankings]);

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
              <Link href="/ranking/vip" className={styles.heroLinkVip}>
                <Trophy size={16} />
                <span>VIP 라운지</span>
              </Link>
            </div>
          </div>
        </section>

        <div className={styles.container}>
          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <Users size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{stats?.participantCount || 0}</span>
                <span className={styles.statLabel}>총 후원자</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>TOP 50</span>
                <span className={styles.statLabel}>명예의 전당</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filterSection}>
            <div className={styles.filterTabs}>
              <Link href="/ranking" className={`${styles.filterTab} ${styles.active}`}>
                <Crown size={14} />
                전체 기간
              </Link>
              <Link href="/ranking/season/current" className={styles.filterTab}>
                <Calendar size={14} />
                시즌별
              </Link>
            </div>

            <div className={styles.unitTabs}>
              {(["all", "excel", "crew"] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => setUnitFilter(unit)}
                  className={`${styles.unitTab} ${unitFilter === unit ? styles.active : ""}`}
                  data-unit={unit}
                >
                  {unit === "all" ? "전체" : unit === "excel" ? "엑셀부" : "크루부"}
                </button>
              ))}
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
                    TOP 3 명예의 전당
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
