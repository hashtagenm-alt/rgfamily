"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, Calendar, ChevronRight } from "lucide-react";
import Footer from "@/components/Footer";
import { useSupabaseContext } from "@/lib/context";
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
    <main className={styles.main}>
      {/* Compact Header - Game Stats Style */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.backBtn}>
              <ArrowLeft size={16} />
            </Link>
            <div className={styles.titleArea}>
              <h1 className={styles.pageTitle}>
                All-Time Rankings
                <span className={styles.goldAccent} />
              </h1>
              <span className={styles.subtitle}>전체 기간 누적 랭킹</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            {currentSeason && (
              <Link href={`/ranking/season/${currentSeason.id}`} className={styles.seasonLink}>
                <span className={styles.liveDot} />
                <span>{currentSeason.name}</span>
                <ChevronRight size={14} />
              </Link>
            )}
            <Link href="/ranking/vip" className={styles.vipLink}>
              <Trophy size={14} />
              <span>VIP</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        {/* Quick Stats Bar */}
        {stats && (
          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <Users size={14} />
              <span className={styles.statValue}>{stats.participantCount}</span>
              <span className={styles.statLabel}>참여자</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <Link href="/ranking" className={`${styles.typeTab} ${styles.active}`}>
              All-Time
            </Link>
            <Link href="/ranking/season/current" className={styles.typeTab}>
              <Calendar size={12} />
              Season
            </Link>
          </div>

          <div className={styles.unitFilter}>
            {(["all", "excel", "crew"] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setUnitFilter(unit)}
                className={`${styles.unitBtn} ${
                  unitFilter === unit ? styles.active : ""
                }`}
                data-unit={unit}
              >
                {unit === "all" ? "ALL" : unit.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : rankings.length === 0 ? (
          <div className={styles.empty}>
            <Trophy size={32} />
            <p>데이터가 없습니다</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <section className={styles.podiumSection}>
              <RankingPodium items={top3} />
            </section>

            {/* Full Ranking List */}
            <section ref={listRef} className={styles.listSection}>
              <div className={styles.listHeader}>
                <span className={styles.listTitle}>전체 랭킹</span>
                <span className={styles.listCount}>TOP {Math.min(50, rankings.length)}</span>
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
  );
}
