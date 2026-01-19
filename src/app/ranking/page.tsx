"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Sparkles, ChevronDown, Calendar, Trophy } from "lucide-react";
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

  const scrollToList = () => {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  const maxAmount = rankings.length > 0 ? rankings[0].totalAmount : 0;
  const top3 = rankings.slice(0, 3);

  return (
    <div className={styles.main}>
      {/* Minimal Navigation Bar */}
      <nav className={styles.pageNav}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={18} />
        </Link>
        <div className={styles.navTitle}>
          <Sparkles size={14} />
          <span>RANKINGS</span>
        </div>
        <Link href="/ranking/vip" className={styles.vipBtn}>
          <Crown size={14} />
          <span>VIP</span>
        </Link>
      </nav>

      {/* Premium Hero Section - Gold Theme (All-Time) */}
      <div className={styles.hero}>
        {/* Ambient Orbs */}
        <div className={styles.ambientOrbs}>
          <motion.div
            className={`${styles.orb} ${styles.orbGold}`}
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className={`${styles.orb} ${styles.orbSecondary}`}
            animate={{
              x: [0, -20, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className={styles.heroBadge}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Trophy size={12} />
            <span>HALL OF FAME</span>
          </motion.span>
          <motion.h1
            className={styles.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            RANKINGS
          </motion.h1>
          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            All-Time Top Supporters
          </motion.p>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.button
          onClick={scrollToList}
          className={styles.scrollIndicator}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{
            opacity: { delay: 1 },
            y: { duration: 1.5, repeat: Infinity }
          }}
        >
          <ChevronDown size={24} />
        </motion.button>
      </div>

      <div className={styles.container}>
        {/* Filters & Season Navigation */}
        <div className={styles.filters}>
          <div className={styles.unitFilter}>
            {(["excel", "crew", "all"] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setUnitFilter(unit)}
                className={`${styles.unitButton} ${
                  unitFilter === unit ? styles.active : ""
                }`}
                data-unit={unit}
              >
                {unit === "excel"
                  ? "EXCEL"
                  : unit === "crew"
                  ? "CREW"
                  : "ALL"}
              </button>
            ))}
          </div>

          {/* Season Info & Link */}
          <div className={styles.seasonNav}>
            {currentSeason && (
              <span className={styles.currentSeason}>
                <span className={styles.seasonLive} />
                {currentSeason.name}
              </span>
            )}
            <Link href="/ranking/season" className={styles.seasonBtn}>
              <Calendar size={12} />
              <span>시즌별 랭킹</span>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <p>로딩 중...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className={styles.empty}>
            <p>No rankings available</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <section className={styles.podiumSection}>
              <RankingPodium items={top3} />
            </section>

            {/* Full Ranking List */}
            <section ref={listRef} className={styles.fullListSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Full Rankings</h2>
                <span className={styles.sectionBadge}>TOP 50</span>
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
    </div>
  );
}
