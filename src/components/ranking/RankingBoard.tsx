"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown } from "lucide-react";
import { useRanking } from "@/lib/hooks";
import styles from "./RankingBoard.module.css";

interface RankingDisplayItem {
  rank: number;
  name: string;
  amount: number;
  unit: "excel" | "crew" | null;
}

export default function RankingBoard() {
  const [activeTab, setActiveTab] = useState<"season" | "total">("season");
  const {
    rankings,
    currentSeason,
    isLoading,
    error,
    setSelectedSeasonId,
    refetch,
  } = useRanking();

  // 탭 변경 시 시즌 ID 설정
  useEffect(() => {
    if (activeTab === "season" && currentSeason) {
      setSelectedSeasonId(currentSeason.id);
    } else if (activeTab === "total") {
      setSelectedSeasonId(null);
    }
  }, [activeTab, currentSeason, setSelectedSeasonId]);

  // Top 5만 표시
  const rankingData: RankingDisplayItem[] = rankings.slice(0, 5).map((item, idx) => ({
    rank: idx + 1,
    name: item.donorName,
    amount: item.totalAmount,
    unit: null, // Repository에서 unit 정보가 없으므로 null
  }));

  // Calculate max amount for progress bars
  const maxAmount = rankingData[0]?.amount || 1;

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Trophy size={18} className={styles.titleIcon} />
          <span>RANKING</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "season" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("season")}
          >
            SEASON
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "total" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("total")}
          >
            TOTAL
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.loading}>로딩 중...</div>
        ) : error ? (
          <div className={styles.error}>
            <span>{error}</span>
            <button onClick={refetch} className={styles.retryBtn}>다시 시도</button>
          </div>
        ) : rankingData.length === 0 ? (
          <div className={styles.empty}>랭킹 데이터가 없습니다</div>
        ) : rankingData.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={styles.item}
          >
            {/* Progress Bar Background */}
            <div
              className={styles.progressBar}
              style={{ width: `${(item.amount / maxAmount) * 100}%` }}
            />

            <span
              className={`${styles.rank} ${styles[`rank${item.rank}`] || ""}`}
            >
              {item.rank}
            </span>

            <div className={styles.info}>
              <span className={styles.nickname}>
                {item.rank === 1 && (
                  <Crown size={14} className={styles.crown} />
                )}
                {item.name}
              </span>
              {/* 하트 개수 숨김 - 게이지바만 표시 */}
            </div>

            {item.unit && (
              <span
                className={`${styles.unitBadge} ${
                  item.unit === "excel" ? styles.unitExcel : styles.unitCrew
                }`}
              >
                {item.unit.toUpperCase()}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
